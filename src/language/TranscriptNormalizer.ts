export class TranscriptNormalizer {
  private readonly contractions: Record<string, string> = { "i'd": 'i would', "i’ll": 'i will', "i'm": 'i am', "don't": 'do not', "can't": 'cannot', "couldn't": 'could not' };
  normalize(input: string): string {
    let value = input.toLowerCase().replace(/[’]/g, "'");
    for (const [short, expanded] of Object.entries(this.contractions)) value = value.replaceAll(short, expanded);
    return value.replace(/[^a-z\s']/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
