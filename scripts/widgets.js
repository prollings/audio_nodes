import * as draw from "./canvas.js";
import * as consts from "./consts.js";

const colLabel          = "#eee";
const colWidgetArea     = "#333";
const colCheckboxStroke = "#777";
const colCheckboxFill   = "#999";
const colWidgetHover    = "#aaa3";
const colButtonFill     = "#666";

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

    onEnter() {
        this.meta.mouseHovered = true;
    }

    onLeave() {
        this.meta.mouseHovered = false;
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
        this.checked = false;
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
        if (this.checked) {
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
        this.checked = !this.checked;
        this.parentInput.receive(this.checked);
    }
}

export class Button extends Widget {
    constructor(parent) {
        super(parent);
    }

    draw() {
        // bound
        draw.fillRect(this.pos, this.size, colWidgetArea);
        // button\
        let buttonPos = {
            x: this.pos.x + 1,
            y: this.pos.y + 1
        };
        let buttonSize = {
            h: this.size.h - 2,
            w: this.size.w - 2
        };
        draw.fillRect(buttonPos, buttonSize, colButtonFill);
        // label
        let labelPos = {
            x: this.pos.x + (this.size.w / 2),
            y: this.pos.y + 12
        };
        draw.fillText(labelPos, this.label, colLabel, textSize, "center");
        // highlight
        if (this.meta.mouseHovered) {
            draw.fillRect(buttonPos, buttonSize, colWidgetHover);
        }
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

    onValueChange() {
        this.parentInput.receive(this.value);
        this.parentInput.propagatePendingStatus();
        this.parentInput.setReady();
    };
}