import { describe, expect, it } from 'vitest';

import { Sentences } from '../sentences.ts';

describe('Sentences', () => {
  it('ends a sentence after a typographic closing quote', () => {
    expect(Sentences.of('Press „Моди“. Then “Mods.” Open it’s menu.')).toEqual([
      'Press „Моди“.',
      'Then “Mods.”',
      'Open it’s menu.',
    ]);
  });

  it('does not end a Ukrainian sentence after див. or напр.', () => {
    expect(Sentences.of('Ставте моди, напр. Better Altars, див. Налаштування.')).toEqual([
      'Ставте моди, напр. Better Altars, див. Налаштування.',
    ]);
  });

  it('does not end a sentence at a numbered abbreviation before its number', () => {
    expect(Sentences.of('Відкрийте Mods. Див. п. 3 та рис. 2. See p. 4 or Fig. 3.')).toEqual([
      'Відкрийте Mods.',
      'Див. п. 3 та рис. 2.',
      'See p. 4 or Fig. 3.',
    ]);
    expect(Sentences.of('Say no. Then play.')).toEqual(['Say no.', 'Then play.']);
  });

  it('ends a sentence before an opening Spanish mark and after the stops of other scripts', () => {
    expect(Sentences.of('Hola. ¿Qué pasa? ¡Vamos!')).toEqual(['Hola.', '¿Qué pasa?', '¡Vamos!']);
    expect(Sentences.of('Ναι; Όχι.')).toEqual(['Ναι;', 'Όχι.']);
    expect(Sentences.of('Մեկ։ Երկու։')).toEqual(['Մեկ։', 'Երկու։']);
  });

  it('keeps a semicolon inside its sentence', () => {
    expect(Sentences.of('Open it; Steam starts.')).toEqual(['Open it; Steam starts.']);
  });

  it('ends a sentence at an ellipsis and at the stops of scripts without capitals', () => {
    expect(Sentences.of('Зачекайте… Далі грайте.')).toEqual(['Зачекайте…', 'Далі грайте.']);
    expect(Sentences.of('One. ثانية؟ ثالثة. 第四。第五！')).toEqual([
      'One.',
      'ثانية؟',
      'ثالثة.',
      '第四。',
      '第五！',
    ]);
    expect(Sentences.of('पहला। दूसरा।')).toEqual(['पहला।', 'दूसरा।']);
  });

  it('counts as words only the parts that hold a letter or digit', () => {
    expect(Sentences.words('One — two, 3 !')).toEqual(['One', 'two,', '3']);
  });
});
