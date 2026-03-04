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
    </defs>
    <g transform="translate(480, 30)" opacity="0.92" filter="url(#glow)">
    <!-- Aura -->
    <ellipse
      cx="40"
      cy="160"
      rx="90"
      ry="120"
      fill="#440022"
      opacity="0.15"
    >
      <animate
        attributeName="rx"
        values="85;95;85"
        dur="4s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.1;0.2;0.1"
        dur="4s"
        repeatCount="indefinite"
      />
    </ellipse>
    <!-- Rings -->
    <ellipse
      cx="40"
      cy="140"
      rx="70"
      ry="70"
      fill="none"
      stroke="#ff0088"
      stroke-width="0.6"
      opacity="0.12"
    >
      <animate
        attributeName="rx"
        values="65;75;65"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="ry"
        values="65;75;65"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.06;0.15;0.06"
        dur="3s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="40"
      cy="140"
      rx="55"
      ry="55"
      fill="none"
      stroke="#ff0044"
      stroke-width="0.4"
      opacity="0.08"
    >
      <animate
        attributeName="rx"
        values="50;60;50"
        dur="2.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="ry"
        values="50;60;50"
        dur="2.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.04;0.12;0.04"
        dur="2.5s"
        repeatCount="indefinite"
      />
    </ellipse>
    <!-- Body -->
    <rect x="10" y="95" width="60" height="120" rx="4" fill="#2a0018" />
    <!-- Armor Plate -->
    <rect
      x="14"
      y="100"
      width="52"
      height="110"
      rx="3"
      fill="#440022"
    />
    <!-- Center Chest Plate -->
    <rect x="22" y="105" width="36" height="50" rx="2" fill="#550030" />
    <!-- Chest Energy Core -->
    <ellipse
      cx="40"
      cy="125"
      rx="8"
      ry="8"
      fill="#ff0088"
      opacity="0.15"
    >
      <animate
        attributeName="opacity"
        values="0.08;0.25;0.08"
        dur="2s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="rx"
        values="7;10;7"
        dur="2s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="ry"
        values="7;10;7"
        dur="2s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="40"
      cy="125"
      rx="4"
      ry="4"
      fill="#ff0088"
      opacity="0.4"
    >
      <animate
        attributeName="opacity"
        values="0.25;0.6;0.25"
        dur="2s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="40"
      cy="125"
      rx="1.5"
      ry="1.5"
      fill="#ff88bb"
      opacity="0.7"
    />
    <!-- Chest Ribbing -->
    <line
      x1="22"
      y1="115"
      x2="58"
      y2="115"
      stroke="#660038"
      stroke-width="0.5"
    />
    <line
      x1="22"
      y1="120"
      x2="58"
      y2="120"
      stroke="#660038"
      stroke-width="0.5"
    />
    <line
      x1="22"
      y1="130"
      x2="58"
      y2="130"
      stroke="#660038"
      stroke-width="0.5"
    />
    <line
      x1="22"
      y1="135"
      x2="58"
      y2="135"
      stroke="#660038"
      stroke-width="0.5"
    />
    <line
      x1="22"
      y1="145"
      x2="58"
      y2="145"
      stroke="#660038"
      stroke-width="0.5"
    />
    <!-- Side Panel Lines -->
    <line
      x1="14"
      y1="105"
      x2="14"
      y2="205"
      stroke="#660038"
      stroke-width="0.4"
    />
    <line
      x1="66"
      y1="105"
      x2="66"
      y2="205"
      stroke="#660038"
      stroke-width="0.4"
    />

    <!-- Shoulder Pauldrons -->
    <!-- Left -->
    <path
      d="M10,95 Q-15,85 -20,100 Q-18,115 -5,118 Q5,115 10,110 Z"
      fill="#440022"
      stroke="#660038"
      stroke-width="0.5"
    />
    <path
      d="M8,97 Q-10,90 -14,102 Q-12,112 -2,114 Q6,112 8,108 Z"
      fill="#550030"
    />
    <!-- Pauldron Spikes -->
    <path d="M-14,100 L-22,88 L-12,96 Z" fill="#660038" />
    <path d="M-16,105 L-26,97 L-14,103 Z" fill="#660038" />
    <!-- Right -->
    <path
      d="M70,95 Q95,85 100,100 Q98,115 85,118 Q75,115 70,110 Z"
      fill="#440022"
      stroke="#660038"
      stroke-width="0.5"
    />
    <path
      d="M72,97 Q90,90 94,102 Q92,112 82,114 Q74,112 72,108 Z"
      fill="#550030"
    />
    <!-- Pauldron Spikes -->
    <path d="M94,100 L102,88 L92,96 Z" fill="#660038" />
    <path d="M96,105 L106,97 L94,103 Z" fill="#660038" />

    <!-- Head -->
    <rect x="20" y="60" width="40" height="40" rx="5" fill="#2a0018" />
    <!-- Helmet Plating -->
    <rect x="22" y="62" width="36" height="36" rx="4" fill="#440022" />
    <!-- Helmet Ridge -->
    <rect x="35" y="58" width="10" height="6" rx="2" fill="#550030" />
    <!-- Helmet Side Pieces -->
    <rect x="18" y="70" width="5" height="20" rx="1" fill="#550030" />
    <rect x="57" y="70" width="5" height="20" rx="1" fill="#550030" />

    <!-- Crown / Horns -->
    <!-- Left Horn -->
    <path
      d="M24,62 Q18,40 10,25 Q8,20 12,18 Q16,22 20,35 Q22,48 24,58 Z"
      fill="#660038"
      stroke="#880044"
      stroke-width="0.4"
    >
      <animate
        attributeName="d"
        values="M24,62 Q18,40 10,25 Q8,20 12,18 Q16,22 20,35 Q22,48 24,58 Z;M24,62 Q16,38 8,22 Q6,17 10,15 Q14,19 18,33 Q21,47 24,58 Z;M24,62 Q18,40 10,25 Q8,20 12,18 Q16,22 20,35 Q22,48 24,58 Z"
        dur="6s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Center Horn -->
    <path
      d="M36,60 Q35,35 34,15 Q33,8 37,5 Q41,4 43,8 Q44,15 44,35 Q44,50 44,60 Z"
      fill="#770040"
      stroke="#990055"
      stroke-width="0.4"
    >
      <animate
        attributeName="d"
        values="M36,60 Q35,35 34,15 Q33,8 37,5 Q41,4 43,8 Q44,15 44,35 Q44,50 44,60 Z;M36,60 Q34,33 33,12 Q32,5 36,2 Q40,1 42,5 Q43,12 43,33 Q43,48 44,60 Z;M36,60 Q35,35 34,15 Q33,8 37,5 Q41,4 43,8 Q44,15 44,35 Q44,50 44,60 Z"
        dur="5s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Right Horn -->
    <path
      d="M56,62 Q62,40 70,25 Q72,20 68,18 Q64,22 60,35 Q58,48 56,58 Z"
      fill="#660038"
      stroke="#880044"
      stroke-width="0.4"
    >
      <animate
        attributeName="d"
        values="M56,62 Q62,40 70,25 Q72,20 68,18 Q64,22 60,35 Q58,48 56,58 Z;M56,62 Q64,38 72,22 Q74,17 70,15 Q66,19 62,33 Q59,47 56,58 Z;M56,62 Q62,40 70,25 Q72,20 68,18 Q64,22 60,35 Q58,48 56,58 Z"
        dur="6s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Horn Glow Tips -->
    <circle cx="12" cy="18" r="2" fill="#ff0088" opacity="0.5">
      <animate
        attributeName="opacity"
        values="0.3;0.7;0.3"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="38" cy="5" r="2.5" fill="#ff0088" opacity="0.6">
      <animate
        attributeName="opacity"
        values="0.3;0.8;0.3"
        dur="1.8s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="68" cy="18" r="2" fill="#ff0088" opacity="0.5">
      <animate
        attributeName="opacity"
        values="0.3;0.7;0.3"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>

    <!-- Three Eyes -->
    <!-- Left Eye -->
    <rect
      x="25"
      y="74"
      width="8"
      height="6"
      rx="1"
      fill="#ff0000"
      opacity="0.9"
    >
      <animate
        attributeName="opacity"
        values="0.7;1;0.7"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </rect>
    <rect
      x="27"
      y="75.5"
      width="4"
      height="3"
      rx="0.5"
      fill="#ffaaaa"
      opacity="0.8"
    />
    <rect
      x="28"
      y="76"
      width="2"
      height="2"
      rx="0.3"
      fill="#ffffff"
      opacity="0.6"
    />
    <!-- Center Eye (larger) -->
    <rect
      x="33"
      y="72"
      width="14"
      height="10"
      rx="2"
      fill="#ff0000"
      opacity="0.95"
    >
      <animate
        attributeName="opacity"
        values="0.8;1;0.8"
        dur="1.2s"
        repeatCount="indefinite"
      />
    </rect>
    <rect
      x="36"
      y="74"
      width="8"
      height="6"
      rx="1"
      fill="#ffaaaa"
      opacity="0.8"
    />
    <rect
      x="38"
      y="75"
      width="4"
      height="4"
      rx="0.5"
      fill="#ffffff"
      opacity="0.7"
    />
    <!-- Pupil animation -->
    <rect x="39" y="76" width="2" height="2" rx="0.5" fill="#ff0044">
      <animate
        attributeName="x"
        values="39;37;41;39"
        dur="4s"
        repeatCount="indefinite"
      />
    </rect>
    <!-- Right Eye -->
    <rect
      x="47"
      y="74"
      width="8"
      height="6"
      rx="1"
      fill="#ff0000"
      opacity="0.9"
    >
      <animate
        attributeName="opacity"
        values="0.7;1;0.7"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </rect>
    <rect
      x="49"
      y="75.5"
      width="4"
      height="3"
      rx="0.5"
      fill="#ffaaaa"
      opacity="0.8"
    />
    <rect
      x="50"
      y="76"
      width="2"
      height="2"
      rx="0.3"
      fill="#ffffff"
      opacity="0.6"
    />
    <!-- Eye Glow -->
    <rect
      x="23"
      y="72"
      width="12"
      height="10"
      rx="2"
      fill="#ff0000"
      opacity="0.1"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.15;0.05"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </rect>
    <rect
      x="31"
      y="70"
      width="18"
      height="14"
      rx="3"
      fill="#ff0000"
      opacity="0.1"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.2;0.05"
        dur="1.2s"
        repeatCount="indefinite"
      />
    </rect>
    <rect
      x="45"
      y="72"
      width="12"
      height="10"
      rx="2"
      fill="#ff0000"
      opacity="0.1"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.15;0.05"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </rect>

    <!-- Belt / Midsection -->
    <rect x="8" y="155" width="64" height="6" rx="1" fill="#330018" />
    <rect x="28" y="155" width="24" height="6" rx="1" fill="#550030" />
    <!-- Belt Buckle -->
    <ellipse
      cx="40"
      cy="158"
      rx="5"
      ry="3"
      fill="#ff0088"
      opacity="0.3"
    >
      <animate
        attributeName="opacity"
        values="0.2;0.4;0.2"
        dur="2s"
        repeatCount="indefinite"
      />
    </ellipse>

    <!-- Arms -->
    <!-- Left Arm -->
    <path
      d="M10,100 Q-5,110 -15,130 Q-20,145 -18,160 Q-15,170 -10,175"
      fill="none"
      stroke="#440022"
      stroke-width="8"
      stroke-linecap="round"
    />
    <path
      d="M10,100 Q-5,110 -15,130 Q-20,145 -18,160 Q-15,170 -10,175"
      fill="none"
      stroke="#550030"
      stroke-width="5"
      stroke-linecap="round"
    />
    <!-- Left Fist -->
    <circle cx="-10" cy="175" r="6" fill="#2a0018" />
    <!-- Left Fist Glow -->
    <circle cx="-10" cy="175" r="8" fill="#ff0088" opacity="0.1">
      <animate
        attributeName="opacity"
        values="0.05;0.15;0.05"
        dur="2s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="r"
        values="7;10;7"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>
    <!-- Right Arm -->
    <path
      d="M70,100 Q85,110 95,130 Q100,145 98,160 Q95,170 90,175"
      fill="none"
      stroke="#440022"
      stroke-width="8"
      stroke-linecap="round"
    />
    <path
      d="M70,100 Q85,110 95,130 Q100,145 98,160 Q95,170 90,175"
      fill="none"
      stroke="#550030"
      stroke-width="5"
      stroke-linecap="round"
    />
    <!-- Right Fist -->
    <circle cx="90" cy="175" r="6" fill="#2a0018" />
    <!-- Right Fist Energy Orb -->
    <circle cx="90" cy="175" r="5" fill="#ff0088" opacity="0.25">
      <animate
        attributeName="opacity"
        values="0.15;0.4;0.15"
        dur="1.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="r"
        values="4;7;4"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="90" cy="175" r="2.5" fill="#ff88bb" opacity="0.5">
      <animate
        attributeName="opacity"
        values="0.3;0.7;0.3"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </circle>

    <!-- Legs -->
    <!-- Left Leg -->
    <rect x="14" y="215" width="18" height="70" rx="3" fill="#2a0018" />
    <rect x="16" y="220" width="14" height="55" rx="2" fill="#440022" />
    <!-- Knee Plate -->
    <ellipse
      cx="23"
      cy="248"
      rx="8"
      ry="6"
      fill="#550030"
      opacity="0.7"
    />
    <!-- Shin Guard -->
    <rect
      x="17"
      y="255"
      width="12"
      height="20"
      rx="2"
      fill="#550030"
      opacity="0.5"
    />
    <!-- Boot -->
    <path
      d="M12,282 Q10,288 14,292 L34,292 Q38,288 34,282 Z"
      fill="#1a0011"
    />
    <!-- Right Leg -->
    <rect x="48" y="215" width="18" height="70" rx="3" fill="#2a0018" />
    <rect x="50" y="220" width="14" height="55" rx="2" fill="#440022" />
    <!-- Knee Plate -->
    <ellipse
      cx="57"
      cy="248"
      rx="8"
      ry="6"
      fill="#550030"
      opacity="0.7"
    />
    <!-- Shin Guard -->
    <rect
      x="51"
      y="255"
      width="12"
      height="20"
      rx="2"
      fill="#550030"
      opacity="0.5"
    />
    <!-- Boot -->
    <path
      d="M46,282 Q44,288 48,292 L68,292 Q72,288 68,282 Z"
      fill="#1a0011"
    />

    <!-- Floating Temporal Shards -->
    <path d="M-30,120 L-35,110 L-28,115 Z" fill="#ff0088" opacity="0.3">
      <animate
        attributeName="opacity"
        values="0.1;0.4;0.1"
        dur="3s"
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0,0;-3,-5;0,0"
        dur="3s"
        repeatCount="indefinite"
      />
    </path>
    <path
      d="M105,130 L112,122 L108,128 Z"
      fill="#ff0044"
      opacity="0.25"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.35;0.1"
        dur="3.5s"
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0,0;4,-3;0,0"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </path>
    <path d="M-25,160 L-32,155 L-27,158 Z" fill="#ff0088" opacity="0.2">
      <animate
        attributeName="opacity"
        values="0.05;0.3;0.05"
        dur="4s"
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0,0;-4,3;0,0"
        dur="4s"
        repeatCount="indefinite"
      />
    </path>
    <path d="M100,155 L108,150 L103,153 Z" fill="#ff0044" opacity="0.2">
      <animate
        attributeName="opacity"
        values="0.05;0.3;0.05"
        dur="2.8s"
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0,0;3,4;0,0"
        dur="2.8s"
        repeatCount="indefinite"
      />
    </path>

    <!-- Dark Energy Tendrils -->
    <path
      d="M15,210 Q0,230 -15,260 Q-25,280 -20,300"
      fill="none"
      stroke="#ff0088"
      stroke-width="1"
      opacity="0.15"
      stroke-dasharray="4,6"
    >
      <animate
        attributeName="stroke-dashoffset"
        values="0;10"
        dur="1.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.08;0.2;0.08"
        dur="3s"
        repeatCount="indefinite"
      />
    </path>
    <path
      d="M65,210 Q80,230 95,260 Q105,280 100,300"
      fill="none"
      stroke="#ff0088"
      stroke-width="1"
      opacity="0.15"
      stroke-dasharray="4,6"
    >
      <animate
        attributeName="stroke-dashoffset"
        values="0;10"
        dur="1.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.08;0.2;0.08"
        dur="3s"
        repeatCount="indefinite"
      />
    </path>
    <path
      d="M40,220 Q35,250 30,280 Q25,300 28,320"
      fill="none"
      stroke="#ff0044"
      stroke-width="0.6"
      opacity="0.1"
      stroke-dasharray="3,8"
    >
      <animate
        attributeName="stroke-dashoffset"
        values="0;8"
        dur="2s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.05;0.15;0.05"
        dur="4s"
        repeatCount="indefinite"
      />
    </path>
    </g>
  </svg>
`;

export class TitleParadoxLord extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

customElements.define("title-paradox-lord", TitleParadoxLord);
