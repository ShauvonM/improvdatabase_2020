import {Injectable} from '@angular/core';
import {Converter} from 'showdown';

@Injectable({providedIn: 'root'})
export class MarkdownService {
  private mdConverter: Converter;

  constructor() {
    this.mdConverter = new Converter();

    this.mdConverter.setOption('openLinksInNewWindow', 'true');
    this.mdConverter.setOption('simplifiedAutoLink', 'true');
    this.mdConverter.setOption('excludeTrailingPunctuationFromURLs', 'true');
  }

  convert(text: string): string {
    return this.mdConverter.makeHtml(text);
  }
}
