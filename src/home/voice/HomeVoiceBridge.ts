import { EventBus } from '../../game/events/EventBus';
import { GameEvents } from '../../game/events/GameEvents';
import type { SpeechResult } from '../../voice/SpeechProvider';
import { VoiceInputController } from '../../voice/VoiceInputController';
import { resolveHomeVoiceCommand, type HomeVoiceCommand } from './HomeVoiceCommands';

export type { HomeVoiceCommand } from './HomeVoiceCommands';

export class HomeVoiceBridge {
  private readonly controller = new VoiceInputController({ interpret: false });

  constructor(
    private readonly onCommand: (command: HomeVoiceCommand) => void,
    private readonly onStatus: (message: string) => void,
  ) {
    EventBus.on(GameEvents.VOICE_RESULT, this.handleResult);
    EventBus.on(GameEvents.VOICE_ERROR, this.handleError);
  }

  get active(): boolean { return this.controller.isContinuous; }

  toggle(): void {
    if (this.controller.isContinuous) {
      this.controller.stopContinuous();
      this.onStatus('言灵导航已关闭');
    } else {
      this.controller.startContinuous();
      this.onStatus('正在聆听目的地，例如 “Go to the restaurant.”');
    }
  }

  stop(): void {
    this.controller.stopContinuous();
  }

  destroy(): void {
    this.controller.cancel();
    EventBus.off(GameEvents.VOICE_RESULT, this.handleResult);
    EventBus.off(GameEvents.VOICE_ERROR, this.handleError);
  }

  private readonly handleResult = (result: SpeechResult): void => {
    const command = resolveHomeVoiceCommand(result.transcript);
    this.onCommand(command);
  };

  private readonly handleError = (message: string): void => {
    this.onStatus(message);
  };
}
