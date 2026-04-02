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
    <filter id="glow-strong">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <radialGradient id="riftGlow" cx="50%" cy="52%" r="45%">
      <stop offset="0%" stop-color="#8844ff" stop-opacity="0.18" />
      <stop offset="40%" stop-color="#00ccff" stop-opacity="0.07" />
      <stop offset="100%" stop-color="#020210" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="groundGlow" cx="50%" cy="100%" r="60%">
      <stop offset="0%" stop-color="#2a0a44" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#020210" stop-opacity="0" />
    </radialGradient>
    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="rgba(0,0,0,0.15)" />
    </pattern>
    <pattern id="circuitGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(0,200,255,0.03)" stroke-width="0.5"/>
    </pattern>
  </defs>

  <!-- Deep space background -->
  <rect width="700" height="400" fill="#020210" />

  <!-- Ground atmospheric glow -->
  <rect width="700" height="400" fill="url(#groundGlow)" />

  <!-- Circuit grid overlay (very subtle) -->
  <rect width="700" height="400" fill="url(#circuitGrid)" opacity="0.8" />

  <!-- Central temporal rift glow -->
  <rect width="700" height="400" fill="url(#riftGlow)" />

  <!-- Temporal rift rings -->
  <g filter="url(#glow)" opacity="0.55">
    <circle cx="350" cy="210" r="140" fill="none" stroke="#8844ff" stroke-width="0.8">
      <animate attributeName="r" values="140;148;140" dur="4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.55;0.3;0.55" dur="4s" repeatCount="indefinite" />
    </circle>
    <circle cx="350" cy="210" r="105" fill="none" stroke="#00ccff" stroke-width="0.6">
      <animate attributeName="r" values="105;112;105" dur="5.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.5;0.25;0.5" dur="5.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="350" cy="210" r="68" fill="none" stroke="#ff44aa" stroke-width="0.5">
      <animate attributeName="r" values="68;74;68" dur="3s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.4;0.15;0.4" dur="3s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- Background Stars -->
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
    <!-- Extra stars for depth -->
    <circle cx="470" cy="290" r="0.7" fill="#ffffff">
      <animate attributeName="opacity" values="0.2;0.8;0.2" dur="3.4s" repeatCount="indefinite" />
    </circle>
    <circle cx="60" cy="150" r="0.9" fill="#ccddff">
      <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.2s" repeatCount="indefinite" />
    </circle>
    <circle cx="640" cy="200" r="0.6" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.6s" repeatCount="indefinite" />
    </circle>
    <circle cx="120" cy="280" r="1" fill="#aaddff">
      <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2.9s" repeatCount="indefinite" />
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

  <!-- Floating temporal particles -->
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
    <!-- Extra temporal sparks -->
    <circle cx="220" cy="240" r="0.9" fill="#00ccff">
      <animate attributeName="cx" values="220;230;215;220" dur="7s" repeatCount="indefinite" />
      <animate attributeName="cy" values="240;225;248;240" dur="7s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.5;0;0.3;0" dur="7s" repeatCount="indefinite" />
    </circle>
    <circle cx="480" cy="260" r="1.1" fill="#aa44ff">
      <animate attributeName="cx" values="480;495;470;480" dur="4.5s" repeatCount="indefinite" />
      <animate attributeName="cy" values="260;245;270;260" dur="4.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.65;0;0.4;0" dur="4.5s" repeatCount="indefinite" />
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
