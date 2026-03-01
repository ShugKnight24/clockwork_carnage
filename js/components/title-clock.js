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
      <filter id="bigGlow">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <radialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#00ffcc" stop-opacity="0.6">
          <animate attributeName="stop-opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite" />
        </stop>
        <stop offset="50%" stop-color="#4400ff" stop-opacity="0.3">
          <animate attributeName="stop-opacity" values="0.3;0.5;0.3" dur="4s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stop-color="#ff0088" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="clockFace" cx="50%" cy="50%" r="48%">
        <stop offset="0%" stop-color="#1a1a3a" />
        <stop offset="80%" stop-color="#0a0a20" />
        <stop offset="100%" stop-color="#050510" />
      </radialGradient>
    </defs>
  <!-- Portal -->
  <!-- Outer portal corona -->
  <ellipse
    cx="350"
    cy="195"
    rx="170"
    ry="170"
    fill="none"
    stroke="#ff0088"
    stroke-width="2"
    opacity="0.15"
    filter="url(#bigGlow)"
  >
    <animate
      attributeName="rx"
      values="165;175;165"
      dur="5s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="ry"
      values="165;175;165"
      dur="5s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="opacity"
      values="0.1;0.25;0.1"
      dur="5s"
      repeatCount="indefinite"
    />
  </ellipse>

  <!-- Portal Glow -->
  <ellipse
    cx="350"
    cy="195"
    rx="140"
    ry="140"
    fill="url(#portalGlow)"
    filter="url(#bigGlow)"
  >
    <animate
      attributeName="rx"
      values="130;148;130"
      dur="4s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="ry"
      values="130;148;130"
      dur="4s"
      repeatCount="indefinite"
    />
  </ellipse>

  <!-- Portal Core -->
  <ellipse
    cx="350"
    cy="195"
    rx="85"
    ry="85"
    fill="#00ffcc"
    opacity="0.06"
    filter="url(#bigGlow)"
  >
    <animate
      attributeName="rx"
      values="80;92;80"
      dur="3s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="ry"
      values="80;92;80"
      dur="3s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="opacity"
      values="0.04;0.1;0.04"
      dur="3s"
      repeatCount="indefinite"
    />
  </ellipse>

  <!-- Fracture Lines -->
  <g opacity="0.4" filter="url(#glow)">
    <line
      x1="350"
      y1="195"
      x2="200"
      y2="80"
      stroke="#00ffcc"
      stroke-width="0.8"
      opacity="0.3"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.5;0.1"
        dur="2.5s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="500"
      y2="70"
      stroke="#4400ff"
      stroke-width="0.6"
      opacity="0.25"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.4;0.05"
        dur="3.2s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="180"
      y2="320"
      stroke="#ff0088"
      stroke-width="0.7"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.35;0.1"
        dur="2.8s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="530"
      y2="310"
      stroke="#00ffcc"
      stroke-width="0.5"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.3;0.05"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="140"
      y2="195"
      stroke="#8866ff"
      stroke-width="0.6"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.4;0.1"
        dur="2.1s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="560"
      y2="180"
      stroke="#ff4466"
      stroke-width="0.5"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.35;0.05"
        dur="2.9s"
        repeatCount="indefinite"
      />
    </line>
  </g>

  <!-- Energy Rings -->
  <g filter="url(#glow)">
    <ellipse
      cx="350"
      cy="195"
      rx="120"
      ry="120"
      fill="none"
      stroke="#00ffcc"
      stroke-width="1"
      opacity="0.4"
    >
      <animate
        attributeName="rx"
        values="115;128;115"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="ry"
        values="115;128;115"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.3;0.6;0.3"
        dur="3s"
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;360 350 195"
        dur="20s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="350"
      cy="195"
      rx="160"
      ry="100"
      fill="none"
      stroke="#4400ff"
      stroke-width="0.8"
      opacity="0.35"
      stroke-dasharray="8,12"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;-360 350 195"
        dur="25s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.25;0.5;0.25"
        dur="4s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="350"
      cy="195"
      rx="100"
      ry="155"
      fill="none"
      stroke="#ff0088"
      stroke-width="0.6"
      opacity="0.3"
      stroke-dasharray="4,16"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;360 350 195"
        dur="30s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.2;0.4;0.2"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </ellipse>
    <!-- Ring Pulse -->
    <circle
      cx="350"
      cy="195"
      r="75"
      fill="none"
      stroke="#00ffcc"
      stroke-width="0.5"
      opacity="0"
    >
      <animate
        attributeName="r"
        values="75;160"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.4;0"
        dur="3s"
        repeatCount="indefinite"
      />
    </circle>
    <circle
      cx="350"
      cy="195"
      r="75"
      fill="none"
      stroke="#ff0088"
      stroke-width="0.4"
      opacity="0"
    >
      <animate
        attributeName="r"
        values="75;160"
        dur="3s"
        begin="1.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.3;0"
        dur="3s"
        begin="1.5s"
        repeatCount="indefinite"
      />
    </circle>
  </g>

  <!-- Broken Clock -->
  <g filter="url(#glow)">
    <!-- Clock body -->
    <circle
      cx="350"
      cy="195"
      r="70"
      fill="url(#clockFace)"
      stroke="#334466"
      stroke-width="2"
    />
    <circle
      cx="350"
      cy="195"
      r="68"
      fill="none"
      stroke="#00aacc"
      stroke-width="0.5"
      opacity="0.4"
    />

    <!-- Hour markers -->
    <g stroke="#446688" stroke-width="2" opacity="0.7">
      <line x1="350" y1="130" x2="350" y2="140" />
      <line x1="350" y1="250" x2="350" y2="260" />
      <line x1="283" y1="195" x2="293" y2="195" />
      <line x1="407" y1="195" x2="417" y2="195" />
      <!-- Diagonal markers -->
      <line x1="315" y1="143" x2="320" y2="151" opacity="0.5" />
      <line x1="385" y1="143" x2="380" y2="151" opacity="0.5" />
      <line x1="315" y1="247" x2="320" y2="239" opacity="0.5" />
      <line x1="385" y1="247" x2="380" y2="239" opacity="0.5" />
    </g>

    <!-- Clock Hands -->
    <!-- Hour Hand -->
    <line
      x1="350"
      y1="195"
      x2="350"
      y2="155"
      stroke="#00ffcc"
      stroke-width="2.5"
      stroke-linecap="round"
      filter="url(#glow)"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;30 350 195;25 350 195;30 350 195;0 350 195"
        dur="8s"
        repeatCount="indefinite"
      />
    </line>
    <!-- Minute Hand -->
    <line
      x1="350"
      y1="195"
      x2="390"
      y2="175"
      stroke="#ff4466"
      stroke-width="1.8"
      stroke-linecap="round"
      filter="url(#glow)"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;360 350 195;340 350 195;720 350 195"
        dur="6s"
        repeatCount="indefinite"
      />
    </line>
    <!-- Second Hand -->
    <line
      x1="350"
      y1="195"
      x2="350"
      y2="140"
      stroke="#ffaa00"
      stroke-width="0.8"
      stroke-linecap="round"
      opacity="0.7"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;180 350 195;90 350 195;360 350 195;270 350 195;360 350 195"
        dur="3s"
        repeatCount="indefinite"
      />
    </line>

    <!-- Center pin -->
    <circle cx="350" cy="195" r="4" fill="#00ffcc" filter="url(#glow)">
      <animate
        attributeName="r"
        values="3;5;3"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>

    <!-- Crack in the Clock Face -->
    <g opacity="0.8">
      <!-- Main Crack (Top-Right Diagonal) -->
      <line
        x1="355"
        y1="180"
        x2="375"
        y2="155"
        stroke="#00ddcc"
        stroke-width="1.5"
      />
      <line
        x1="375"
        y1="155"
        x2="390"
        y2="140"
        stroke="#00ddcc"
        stroke-width="1.2"
      />
      <line
        x1="390"
        y1="140"
        x2="395"
        y2="132"
        stroke="#00ddcc"
        stroke-width="0.8"
      />
      <!-- Branch Right -->
      <line
        x1="375"
        y1="155"
        x2="395"
        y2="152"
        stroke="#00ddcc"
        stroke-width="1"
      />
      <line
        x1="395"
        y1="152"
        x2="408"
        y2="158"
        stroke="#00ddcc"
        stroke-width="0.7"
      />
      <!-- Branch Upper Left -->
      <line
        x1="375"
        y1="155"
        x2="365"
        y2="140"
        stroke="#00ddcc"
        stroke-width="0.8"
      />
      <!-- Bottom Left Crack -->
      <line
        x1="355"
        y1="180"
        x2="340"
        y2="200"
        stroke="#00ddcc"
        stroke-width="1.3"
      />
      <line
        x1="340"
        y1="200"
        x2="330"
        y2="218"
        stroke="#00ddcc"
        stroke-width="1"
      />
      <line
        x1="330"
        y1="218"
        x2="325"
        y2="230"
        stroke="#00ddcc"
        stroke-width="0.7"
      />
      <!-- Branch Lower Left -->
      <line
        x1="340"
        y1="200"
        x2="325"
        y2="195"
        stroke="#00ddcc"
        stroke-width="0.8"
      />
      <!-- Branch Lower Right -->
      <line
        x1="340"
        y1="200"
        x2="350"
        y2="215"
        stroke="#00ddcc"
        stroke-width="0.7"
      />
      <!-- Small Crack - Center Right -->
      <line
        x1="355"
        y1="180"
        x2="368"
        y2="185"
        stroke="#00ddcc"
        stroke-width="0.9"
      />
      <line
        x1="368"
        y1="185"
        x2="380"
        y2="192"
        stroke="#00ddcc"
        stroke-width="0.6"
      />
      <!-- Small Crack - Center Left -->
      <line
        x1="355"
        y1="180"
        x2="342"
        y2="172"
        stroke="#00ddcc"
        stroke-width="0.7"
      />

      <!-- Glow Effect -->
      <line
        x1="355"
        y1="180"
        x2="375"
        y2="155"
        stroke="#00ffdd"
        stroke-width="4"
        opacity="0.25"
        filter="url(#bigGlow)"
      >
        <animate
          attributeName="opacity"
          values="0.15;0.4;0.15"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="355"
        y1="180"
        x2="340"
        y2="200"
        stroke="#00ffdd"
        stroke-width="4"
        opacity="0.2"
        filter="url(#bigGlow)"
      >
        <animate
          attributeName="opacity"
          values="0.1;0.35;0.1"
          dur="1.8s"
          repeatCount="indefinite"
        />
      </line>
      <!-- Energy Leak -->
      <circle
        cx="355"
        cy="180"
        r="5"
        fill="#00ffcc"
        opacity="0.12"
        filter="url(#bigGlow)"
      >
        <animate
          attributeName="r"
          values="4;8;4"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.08;0.2;0.08"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  </g>
  </svg>
`;

export class TitleClock extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

customElements.define("title-clock", TitleClock);
