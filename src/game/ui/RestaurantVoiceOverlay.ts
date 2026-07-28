export class RestaurantVoiceOverlay {
  private readonly root: HTMLElement;
  constructor(onSubmit: (text: string) => void) {
    const host = document.querySelector<HTMLElement>('#dom-overlay'); if (!host) throw new Error('无法找到餐厅输入层');
    this.root = document.createElement('form'); this.root.className = 'restaurant-voice-overlay';
    this.root.innerHTML = `
      <div class="restaurant-dialogue-head">
        <label for="restaurant-speech"><i></i> DIALOGUE MODE <span>/ 餐厅英语</span></label>
        <small>TEXT PRACTICE</small>
      </div>
      <div class="restaurant-input-line">
        <span class="restaurant-prompt">⌁</span>
        <input id="restaurant-speech" autocomplete="off" aria-label="餐厅英语输入" placeholder="I'd like a sandwich, please.">
        <button type="submit"><span>说给店员</span><i>→</i></button>
      </div>
      <p><b>TRY</b><span>I'm hungry.</span><span>Could I have some water?</span><span>How much is it?</span></p>`;
    this.root.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = this.root.querySelector<HTMLInputElement>('input');
      const text = input?.value.trim();
      if (!input || !text) return;
      onSubmit(text);
      input.select();
    });
    host.replaceChildren(this.root);
  }
  destroy(): void { this.root.remove(); }
}
