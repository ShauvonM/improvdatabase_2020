import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'stripTags'})
export class StripTagsPipe implements PipeTransform {
  transform(htmlString: string): string {
    let div = document.createElement('div');
    div.innerHTML = htmlString;
    return div.textContent || div.innerText || htmlString;
  }
}
