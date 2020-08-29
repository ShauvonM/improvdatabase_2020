import {animate, AnimationTriggerMetadata, state, style, transition, trigger} from '@angular/animations';


export interface StyleType {
  [key: string]: string|number;
}

/**
 * Toggles between two styles.
 * @param name
 * @param outStyle
 * @param inStyle
 * @param duration
 * @param delay
 */
export function createToggle(
    name: string, outStyle: StyleType, inStyle: StyleType,
    duration?: number|string, delay?: number|string): AnimationTriggerMetadata {
  let inString = '';
  let outString = '';
  duration = duration || 250;
  delay = delay || 0;
  if (typeof (duration) === 'string') {
    inString = duration;
  } else {
    inString = `${duration}ms ${delay}ms ease-in-out`;
  }
  if (typeof (delay) === 'string') {
    outString = delay;
  } else {
    outString = inString;
  }

  return trigger(name, [
    state('*', style(inStyle)),
    state('void', style(outStyle)),
    transition('void => *', animate(inString)),
    transition('* => void', animate(outString)),
  ]);
}
