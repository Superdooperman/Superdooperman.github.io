// Taps the master bus and posts stereo Float32 chunks while recording.
class RecTap extends AudioWorkletProcessor {
  constructor() { super(); this.on = false; this.port.onmessage = (e) => { this.on = e.data === 'start'; if (e.data === 'stop') this.port.postMessage({ done: true }); }; }
  process(inputs, outputs) {
    const inp = inputs[0];
    if (inp && inp.length) {
      for (let c = 0; c < outputs[0].length; c++) outputs[0][c].set(inp[Math.min(c, inp.length - 1)]);
      if (this.on) {
        const L = new Float32Array(inp[0]), R = new Float32Array(inp[1] || inp[0]);
        this.port.postMessage({ L, R }, [L.buffer, R.buffer]);
      }
    }
    return true;
  }
}
registerProcessor('rec-tap', RecTap);
