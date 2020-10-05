"use strict";

let canvas;
let ctx;

export function setCanvas(new_canvas) {
    canvas = new_canvas;
    ctx = canvas.getContext("2d");
}

export function setCanvasSize(size) {
    canvas.width = size.w;
    canvas.height = size.h;
}

export function fillRect(pos, size, col) {
    ctx.fillStyle = col;
    ctx.fillRect(pos.x, pos.y, size.w, size.h);
}

export function strokeRect(pos, size, col, lineWidth) {
    ctx.strokeStyle = col;
    ctx.lineJoin = "round";
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(pos.x, pos.y, size.w, size.h);
}

export function strokeBezier(pos1, pos2, col, lineWidth, xMag) {
    let x1 = pos1.x;
    let y1 = pos1.y;
    let x2 = pos2.x;
    let y2 = pos2.y
    ctx.strokeStyle = col;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + xMag, y1, x2 - xMag, y2, x2, y2);
    ctx.stroke();
}

export function fillText(pos, text, col, size, align = "left") {
    ctx.fillStyle = col;
    ctx.font = size + " sans-serif";
    ctx.textAlign = align;
    ctx.fillText(text, pos.x, pos.y);
}

export function drawCircleWithOutline(pos, rad, col, lineCol, lineWidth) {
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, rad, rad, 0, 0, Math.PI * 2);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = lineCol;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.fill();
}

export function fillBackground(col) {
    ctx.fillStyle = col;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}