const template = document.createElement("template");
template.innerHTML = `
<style>
  :host {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  svg {
    width: 100%;
    height: 100%;
  }
</style>
<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <pattern
      id="scanlines"
      width="4"
      height="4"
      patternUnits="userSpaceOnUse"
    >
      <rect width="4" height="2" fill="rgba(0,0,0,0.15)" />
    </pattern>
  </defs>

  <!-- Background Stars -->
  <rect width="700" height="400" fill="#020210" />
  <g opacity="0.6">
    <circle cx="50" cy="30" r="1" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="2.1s" repeatCount="indefinite" />
    </circle>
    <circle cx="150" cy="80" r="0.8" fill="#aaddff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.7s" repeatCount="indefinite" />
    </circle>
    <circle cx="600" cy="50" r="1.2" fill="#ffffff">
      <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="520" cy="120" r="0.7" fill="#ccddff">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.9s" repeatCount="indefinite" />
    </circle>
    <circle cx="80" cy="350" r="1" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.3s" repeatCount="indefinite" />
    </circle>
    <circle cx="650" cy="340" r="0.9" fill="#aaddff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="200" cy="360" r="1.1" fill="#ffffff">
      <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.1s" repeatCount="indefinite" />
    </circle>
    <circle cx="400" cy="20" r="0.6" fill="#ccddff">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="300" cy="370" r="0.8" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="550" cy="380" r="1" fill="#aaddff">
      <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.6s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- Glitch Lines -->
  <g opacity="0.75">
    <rect x="0" y="95" width="700" height="1.5" fill="#00ffcc">
      <animate attributeName="y" values="95;97;95;200;95" dur="4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.9;0;0.9;0" dur="4s" repeatCount="indefinite" />
    </rect>
    <rect x="0" y="250" width="700" height="1" fill="#ff0088">
      <animate attributeName="y" values="250;248;310;250" dur="3s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.2;0;0.15;0" dur="3s" repeatCount="indefinite" />
    </rect>
    <rect x="100" y="180" width="500" height="0.5" fill="#ffffff">
      <animate attributeName="y" values="180;182;100;180" dur="5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.1;0;0.2;0" dur="5s" repeatCount="indefinite" />
    </rect>
  </g>

  <!-- Particles -->
  <g filter="url(#glow)">
    <circle cx="300" cy="180" r="1.5" fill="#00ffcc">
      <animate attributeName="cx" values="300;280;310;300" dur="5s" repeatCount="indefinite" />
      <animate attributeName="cy" values="180;160;170;180" dur="5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.8;0;0.6;0" dur="5s" repeatCount="indefinite" />
    </circle>
    <circle cx="400" cy="210" r="1" fill="#ff4466">
      <animate attributeName="cx" values="400;420;390;400" dur="4s" repeatCount="indefinite" />
      <animate attributeName="cy" values="210;190;220;210" dur="4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.7;0;0.5;0" dur="4s" repeatCount="indefinite" />
    </circle>
    <circle cx="340" cy="230" r="1.2" fill="#ffaa00">
      <animate attributeName="cx" values="340;360;330;340" dur="6s" repeatCount="indefinite" />
      <animate attributeName="cy" values="230;210;240;230" dur="6s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.3;0.9;0.3" dur="6s" repeatCount="indefinite" />
    </circle>
    <circle cx="370" cy="160" r="0.8" fill="#8866ff">
      <animate attributeName="cx" values="370;380;360;370" dur="3.5s" repeatCount="indefinite" />
      <animate attributeName="cy" values="160;150;170;160" dur="3.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.6;0;0.4;0" dur="3.5s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- Scanline overlay -->
  <rect width="700" height="400" fill="url(#scanlines)" opacity="0.5" />
</svg>
`;

export class TitleBackground extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

customElements.define("title-background", TitleBackground);
