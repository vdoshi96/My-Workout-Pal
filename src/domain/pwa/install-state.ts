export function installationIsStandalone(input: Readonly<{
  displayModeStandalone: boolean;
  navigatorStandalone: boolean;
}>): boolean {
  return input.displayModeStandalone || input.navigatorStandalone;
}

export function installOfferIsVisible(input: Readonly<{
  dismissed: boolean;
  installed: boolean;
  promptCaptured: boolean;
}>): boolean {
  return input.promptCaptured && !input.dismissed && !input.installed;
}

export function serviceWorkerUpdateIsReady(input: Readonly<{
  hadController: boolean;
  replacementInstalled: boolean;
}>): boolean {
  return input.hadController && input.replacementInstalled;
}
