// Keyboard and mouse state, with edge-triggered "pressed" for one-shot actions.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressedSet = new Set();
    this.dragX = 0; // accumulated horizontal mouse drag, for camera yaw
    this._dragging = false;
    this._lastX = 0;
    window.addEventListener('keydown', (e) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressedSet.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('mousedown', (e) => {
      this._dragging = true;
      this._lastX = e.clientX;
    });
    window.addEventListener('mouseup', () => {
      this._dragging = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this._dragging) return;
      this.dragX += e.clientX - this._lastX;
      this._lastX = e.clientX;
    });
  }

  down(code) {
    return this.keys.has(code);
  }

  // True exactly once, on the frame the key went down.
  pressed(code) {
    return this.pressedSet.has(code);
  }

  // Call at the end of every frame to clear the edge triggers.
  endFrame() {
    this.pressedSet.clear();
  }
}
