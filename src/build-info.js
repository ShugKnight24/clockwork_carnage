// Written by `npm run release:playtest`; "dev" between releases.
export const BUILD = { version: "0.9.0", sha: "dev", date: "" };
export const buildLabel = () => `v${BUILD.version}${BUILD.sha !== "dev" ? ` (${BUILD.sha})` : " dev"}`;
