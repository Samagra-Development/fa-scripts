export class BasePrefixes {
  private static numberPrefixes: Array<string> = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
  ];

  private static alphabetPrefixes: Array<string> = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
  ];

  private static specialCharPrefixes: Array<string> = ['_'];

  public static all(): Array<string> {
    return this.numberPrefixes
      .concat(this.alphabetPrefixes)
      .concat(this.specialCharPrefixes);
  }
}
