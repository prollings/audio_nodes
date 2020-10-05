import * as draw from "./canvas.js";
import * as consts from "./consts.js";

const colLabel          = "#eee";
const colWidgetArea     = "#333";
const colCheckboxStroke = "#777";
const colCheckboxFill   = "#999";
const colWidgetHover    = "#aaa3";

const textSize = "10px";

let normalSlotHeight = consts.normalSlotHeight;

export class Widget {
    constructor(parent) {
        this.parentInput = parent;
        this.meta = {
            mouseHovered: false,
            mouseDown: false,
        };
        this.size = { w: 0, h: normalSlotHeight };
        this.pos = { x: 0, y: 0 };
        this.visible = true;
    }

    setPos(pos) {
        this.pos = pos;
    }

    setSize(size) {
        this.size = size;
    }

    setLabel(label) {
        this.label = label;
    }

    setVisible(vis) {
        this.visible = vis;
    }

    onClick(pos) {}
    onMouseDown(pos) {}
    onMouseUp(pos) {}
    onMouseMove(pos) {}
    onMouseDrag(move) {}
}

export class Checkbox extends Widget {
    constructor(parent) {
        super(parent);
        this.state = false;
    }

    draw() {
        // widget bound
        draw.fillRect(this.pos, this.size, colWidgetArea);
        // checkbox
        draw.strokeRect(
            { x: this.pos.x + 1, y: this.pos.y + 1},
            { w: 14, h: 14 },
            colCheckboxStroke,
            2
        );
        if (this.state) {
            draw.fillRect(
                { x: this.pos.x + 3, y: this.pos.y + 3 },
                { w: 10, h: 10 },
                colCheckboxFill,
                2
            );
        }
        // label
        draw.fillText(
            { x: this.pos.x + 20, y: this.pos.y + 12 },
            this.label,
            colLabel,
            textSize
        );
        // highlight
        if (this.meta.mouseHovered) {
            draw.fillRect(this.pos, this.size, colWidgetHover);
        }
    }

    onClick() {
        this.state = !this.state;
        this.parentInput.receive(this.state);
    }

    onEnter() {
        this.meta.mouseHovered = true;
    }

    onLeave() {
        this.meta.mouseHovered = false;
    }
}

export class Number extends Widget {
    constructor(parent) {
        super(parent);
        this.value = 0;
        this.limited = false;
        this.upperLimit = 0;
        this.lowerLimit = 0;
        this.step = 0.1;
        this.onValueChange = _ => {
            this.parentInput.propagatePendingStatus();
            this.parentInput.setReady();
        };
    }

    draw() {
        // widget bound
        draw.fillRect(this.pos, this.size, colWidgetArea);
        // value indicator
        // label
        draw.fillText(
            { x: this.pos.x + 5, y: this.pos.y + 12 },
            this.label,
            colLabel,
            textSize
        );
        // value
        draw.fillText(
            { x: this.pos.x + this.size.w, y: this.pos.y + 12 },
            this.value.toFixed(3),
            colLabel,
            textSize,
            "right"
        );
        // highlight
        if (this.meta.mouseHovered) {
            draw.fillRect(this.pos, this.size, colWidgetHover);
        }
    }

    onMouseDown() {
        document.body.requestPointerLock();
    }

    onMouseUp() {
        document.exitPointerLock();
    }

    onMouseDrag(ev) {
        let step = this.step;
        if (ev.shift) {
            step *= 0.25;
        }
        this.value += ev.x * step;
        if (this.limited) {
            this.value = Math.min(this.value, this.upper);
            this.value = Math.max(this.value, this.lower);
        }
        // this.parentInput.receive(this.value);
        this.onValueChange(this.value);
    }

    onEnter() {
        this.meta.mouseHovered = true;
    }

    onLeave() {
        this.meta.mouseHovered = false;
    }
}