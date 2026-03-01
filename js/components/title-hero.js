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
    <g
      transform="translate(115, 10) scale(3.0)"
      opacity="0.95"
      filter="url(#glow)"
    >
    <!-- Cape -->
    <!-- Left -->
    <path
      d="M0,34 Q-4,40 -8,54 Q-12,70 -14,90 Q-13,100 -10,105 Q-6,108 -3,100 Q-1,88 0,72 Z"
      fill="#8b1a1a"
      opacity="0.7"
    >
      <animate
        attributeName="d"
        values="M0,34 Q-4,40 -8,54 Q-12,70 -14,90 Q-13,100 -10,105 Q-6,108 -3,100 Q-1,88 0,72 Z;M0,34 Q-6,42 -10,56 Q-15,74 -17,94 Q-16,104 -12,107 Q-8,110 -4,102 Q-2,90 0,72 Z;M0,34 Q-4,40 -8,54 Q-12,70 -14,90 Q-13,100 -10,105 Q-6,108 -3,100 Q-1,88 0,72 Z"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Center -->
    <path
      d="M-2,32 Q-6,36 -8,44 Q-10,56 -10,72 Q-8,90 -6,102 L30,102 Q32,90 34,72 Q34,56 32,44 Q30,36 26,32 Z"
      fill="#7a1515"
      opacity="0.55"
    >
      <animate
        attributeName="d"
        values="M-2,32 Q-6,36 -8,44 Q-10,56 -10,72 Q-8,90 -6,102 L30,102 Q32,90 34,72 Q34,56 32,44 Q30,36 26,32 Z;M-2,32 Q-7,37 -9,46 Q-12,58 -12,74 Q-10,92 -8,105 L30,105 Q32,92 36,74 Q36,58 33,46 Q31,37 26,32 Z;M-2,32 Q-6,36 -8,44 Q-10,56 -10,72 Q-8,90 -6,102 L30,102 Q32,90 34,72 Q34,56 32,44 Q30,36 26,32 Z"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Right -->
    <path
      d="M24,34 Q28,40 32,54 Q36,70 38,90 Q37,100 34,105 Q30,108 27,100 Q25,88 24,72 Z"
      fill="#8b1a1a"
      opacity="0.7"
    >
      <animate
        attributeName="d"
        values="M24,34 Q28,40 32,54 Q36,70 38,90 Q37,100 34,105 Q30,108 27,100 Q25,88 24,72 Z;M24,34 Q30,42 35,56 Q40,74 42,94 Q41,104 37,107 Q33,110 29,102 Q26,90 24,72 Z;M24,34 Q28,40 32,54 Q36,70 38,90 Q37,100 34,105 Q30,108 27,100 Q25,88 24,72 Z"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Collar -->
    <path
      d="M-2,30 Q-4,26 -3,22 Q0,20 4,22 L4,32"
      fill="#9b2020"
      stroke="#cc3030"
      stroke-width="0.4"
      opacity="0.8"
    />
    <path
      d="M26,30 Q28,26 27,22 Q24,20 20,22 L20,32"
      fill="#9b2020"
      stroke="#cc3030"
      stroke-width="0.4"
      opacity="0.8"
    />
    <!-- Fold Lines -->
    <path
      d="M4,36 Q2,56 0,80 Q-2,96 -4,102"
      fill="none"
      stroke="#a82020"
      stroke-width="0.5"
      opacity="0.5"
    />
    <path
      d="M20,36 Q22,56 24,80 Q26,96 28,102"
      fill="none"
      stroke="#a82020"
      stroke-width="0.5"
      opacity="0.5"
    />
    <path
      d="M12,34 Q12,60 12,85 Q12,96 12,102"
      fill="none"
      stroke="#6b1212"
      stroke-width="0.4"
      opacity="0.35"
    />

    <!-- Torso -->
    <path
      d="M-4,36 Q-9,40 -9,52 Q-8,68 -2,76 L26,76 Q32,68 33,52 Q33,40 28,36 Z"
      fill="#1a2a3a"
    />
    <!-- Chest Plate -->
    <path d="M2,38 Q0,44 1,54 L23,54 Q24,44 22,38 Z" fill="#243d50" />
    <!-- Pecs -->
    <path
      d="M5,40 Q12,46 12,53"
      fill="none"
      stroke="#334466"
      stroke-width="0.8"
      opacity="0.5"
    />
    <path
      d="M19,40 Q12,46 12,53"
      fill="none"
      stroke="#334466"
      stroke-width="0.8"
      opacity="0.5"
    />
    <!-- Plate Center Line -->
    <line
      x1="12"
      y1="38"
      x2="12"
      y2="54"
      stroke="#0d1a28"
      stroke-width="0.7"
      opacity="0.6"
    />
    <!-- Abs -->
    <line
      x1="12"
      y1="56"
      x2="12"
      y2="74"
      stroke="#0d1a28"
      stroke-width="0.7"
      opacity="0.5"
    />
    <line
      x1="5"
      y1="59"
      x2="19"
      y2="59"
      stroke="#0d1a28"
      stroke-width="0.5"
      opacity="0.35"
    />
    <line
      x1="6"
      y1="64"
      x2="18"
      y2="64"
      stroke="#0d1a28"
      stroke-width="0.5"
      opacity="0.35"
    />
    <line
      x1="6"
      y1="69"
      x2="18"
      y2="69"
      stroke="#0d1a28"
      stroke-width="0.5"
      opacity="0.35"
    />

    <!-- Shoulders -->
    <path
      d="M-8,31 Q-15,33 -15,42 Q-13,49 -6,47 Q-2,43 -2,36 Z"
      fill="#243d50"
      stroke="#334466"
      stroke-width="0.5"
    />
    <path
      d="M32,31 Q39,33 39,42 Q37,49 30,47 Q26,43 26,36 Z"
      fill="#243d50"
      stroke="#334466"
      stroke-width="0.5"
    />
    <!-- Pauldron edge highlights -->
    <path
      d="M-13,35 Q-14,40 -11,45"
      fill="none"
      stroke="#446688"
      stroke-width="0.5"
      opacity="0.4"
    />
    <path
      d="M37,35 Q38,40 35,45"
      fill="none"
      stroke="#446688"
      stroke-width="0.5"
      opacity="0.4"
    />

    <!-- Helmet -->
    <!-- Shell -->
    <path
      d="M-1,16 Q-5,12 -4,3 Q-2,-3 12,-5 Q26,-3 28,3 Q29,12 25,16 Q25,26 24,30 L22,32 Q12,34 2,32 L0,30 Q-1,26 -1,16 Z"
      fill="#1a2a3a"
    />
    <!-- Top Ridge -->
    <path
      d="M4,-1 Q12,-6 20,-1"
      fill="none"
      stroke="#334466"
      stroke-width="2"
      opacity="0.6"
    />
    <!--Side Ridges -->
    <path
      d="M-3,10 Q-4,16 -1,23"
      fill="none"
      stroke="#243d50"
      stroke-width="1.3"
      opacity="0.5"
    />
    <path
      d="M27,10 Q28,16 25,23"
      fill="none"
      stroke="#243d50"
      stroke-width="1.3"
      opacity="0.5"
    />
    <!-- Visor -->
    <path
      d="M0,12 Q-1,16 1,20 Q4,23 12,23 Q20,23 23,20 Q25,16 24,12 Q21,9 12,8 Q3,9 0,12 Z"
      fill="#00aadd"
      opacity="0.9"
    >
      <animate
        attributeName="opacity"
        values="0.75;1;0.75"
        dur="2s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Visor Glow -->
    <path
      d="M2,13 Q3,17 4,19 Q8,21 12,21 Q16,21 20,19 Q21,17 22,13 Q18,11 12,10 Q6,11 2,13 Z"
      fill="#00ddff"
      opacity="0.3"
    />
    <!-- Visor Reflection -->
    <path
      d="M4,12 Q9,10 15,12 Q13,15 8,14 Z"
      fill="#ffffff"
      opacity="0.25"
    />
    <!-- Chin Guard -->
    <path
      d="M3,23 Q2,27 4,30 Q12,32 20,30 Q22,27 21,23"
      fill="none"
      stroke="#243d50"
      stroke-width="1.2"
      opacity="0.6"
    />
    <!-- Neck -->
    <rect x="5" y="30" width="14" height="8" rx="3" fill="#1a2a3a" />

    <!-- Left Arm -->
    <!-- Upper Arm -->
    <path
      d="M-4,38 Q-9,38 -13,42 Q-16,46 -15,50 L-13,51 Q-11,47 -9,44 Q-6,41 -4,40 Z"
      fill="#1a2a3a"
    />
    <!-- Bicep Armor -->
    <ellipse
      cx="-11"
      cy="44"
      rx="5"
      ry="5"
      fill="#1a2a3a"
      stroke="#243d50"
      stroke-width="0.5"
    />
    <!-- Forearm -->
    <path
      d="M-15,50 Q-20,52 -24,55 Q-27,57 -26,60 L-24,61 Q-22,58 -19,55 Q-16,53 -14,51 Z"
      fill="#1a2a3a"
    />
    <!-- Forearm Armor -->
    <rect
      x="-25"
      y="53"
      width="8"
      height="3.5"
      rx="1"
      fill="#243d50"
      opacity="0.6"
      transform="rotate(-15 -21 55)"
    />
    <!-- Fist / Glove -->
    <circle cx="-26" cy="59" r="2.8" fill="#1a1a1a" />

    <!-- Rifle -->
    <g transform="rotate(12 -26 59)">
      <!-- Buffer Tube -->
      <rect
        x="-19"
        y="55.5"
        width="7"
        height="5.5"
        rx="1.2"
        fill="#2a2a2a"
      />
      <!-- Stock Pad -->
      <rect
        x="-14"
        y="55"
        width="4.5"
        height="6.5"
        rx="2"
        fill="#222222"
      />
      <!-- Stock Rest -->
      <rect
        x="-18"
        y="54"
        width="6"
        height="2.5"
        rx="1"
        fill="#333333"
      />
      <!-- Stock Ribbing -->
      <line
        x1="-13"
        y1="56"
        x2="-13"
        y2="61"
        stroke="#333"
        stroke-width="0.4"
      />
      <line
        x1="-11.5"
        y1="56"
        x2="-11.5"
        y2="61"
        stroke="#333"
        stroke-width="0.4"
      />

      <!-- Receiver -->
      <!-- Lower -->
      <rect
        x="-32"
        y="55.5"
        width="15"
        height="6.5"
        rx="1"
        fill="#2a2a2a"
      />
      <!-- Upper -->
      <rect
        x="-32"
        y="53.5"
        width="15"
        height="4"
        rx="1"
        fill="#363636"
      />
      <!-- Rail -->
      <rect
        x="-45"
        y="53"
        width="30"
        height="1.2"
        rx="0.3"
        fill="#1a1a1a"
      />
      <!-- Rail Teeth -->
      <line
        x1="-44"
        y1="53"
        x2="-44"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-42"
        y1="53"
        x2="-42"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-40"
        y1="53"
        x2="-40"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-38"
        y1="53"
        x2="-38"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-36"
        y1="53"
        x2="-36"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-34"
        y1="53"
        x2="-34"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-32"
        y1="53"
        x2="-32"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-30"
        y1="53"
        x2="-30"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-28"
        y1="53"
        x2="-28"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-26"
        y1="53"
        x2="-26"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-24"
        y1="53"
        x2="-24"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-22"
        y1="53"
        x2="-22"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-20"
        y1="53"
        x2="-20"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <!-- Ejection Port -->
      <rect
        x="-26"
        y="54.5"
        width="3"
        height="2"
        rx="0.3"
        fill="#1a1a1a"
      />
      <!-- Trigger Guard -->
      <path
        d="M-27,62 Q-27,66 -24.5,66 Q-22,66 -22,62"
        fill="none"
        stroke="#222"
        stroke-width="0.6"
      />
      <!-- Pistol Grip -->
      <rect
        x="-27"
        y="62"
        width="4"
        height="6.5"
        rx="1"
        fill="#222222"
      />
      <!-- Grip -->
      <line
        x1="-26.5"
        y1="63"
        x2="-26.5"
        y2="67.5"
        stroke="#333"
        stroke-width="0.3"
      />
      <line
        x1="-25"
        y1="63"
        x2="-25"
        y2="67.5"
        stroke="#333"
        stroke-width="0.3"
      />

      <!-- Magazine -->
      <rect
        x="-31"
        y="62"
        width="5.5"
        height="11"
        rx="1"
        fill="#1a3a4a"
        transform="rotate(-5 -28 67)"
      />
      <!-- Magazine Energy Strip -->
      <rect
        x="-29.8"
        y="63"
        width="2"
        height="9"
        rx="0.4"
        fill="#00aadd"
        opacity="0.4"
        transform="rotate(-5 -28 67)"
      >
        <animate
          attributeName="opacity"
          values="0.25;0.5;0.25"
          dur="2s"
          repeatCount="indefinite"
        />
      </rect>
      <!-- Magazine Base Plate -->
      <rect
        x="-31.5"
        y="72"
        width="6.5"
        height="1.5"
        rx="0.5"
        fill="#2a2a2a"
        transform="rotate(-5 -28 67)"
      />

      <!-- Barrel -->
      <!-- Handguard -->
      <rect
        x="-48"
        y="54.5"
        width="17"
        height="6"
        rx="1.2"
        fill="#3a3a3a"
      />
      <!-- Handguard Side Panel -->
      <rect
        x="-47"
        y="55"
        width="15"
        height="2"
        rx="0.5"
        fill="#404040"
      />
      <!-- Handguard Vents -->
      <line
        x1="-46"
        y1="56"
        x2="-46"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <line
        x1="-44"
        y1="56"
        x2="-44"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <line
        x1="-42"
        y1="56"
        x2="-42"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <line
        x1="-40"
        y1="56"
        x2="-40"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <line
        x1="-38"
        y1="56"
        x2="-38"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <line
        x1="-36"
        y1="56"
        x2="-36"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <!-- Barrel Extension -->
      <rect
        x="-55"
        y="56"
        width="8"
        height="4"
        rx="0.6"
        fill="#484848"
      />
      <!-- Barrel fluting lines -->
      <line
        x1="-54"
        y1="56.5"
        x2="-48"
        y2="56.5"
        stroke="#3a3a3a"
        stroke-width="0.3"
      />
      <line
        x1="-54"
        y1="59.5"
        x2="-48"
        y2="59.5"
        stroke="#3a3a3a"
        stroke-width="0.3"
      />
      <!-- Muzzle Brake -->
      <rect
        x="-59"
        y="54.5"
        width="5"
        height="7"
        rx="1"
        fill="#505050"
      />
      <!-- Muzzle Brake Ports -->
      <rect
        x="-58.5"
        y="55.5"
        width="1.5"
        height="1.5"
        rx="0.3"
        fill="#333"
      />
      <rect
        x="-58.5"
        y="59"
        width="1.5"
        height="1.5"
        rx="0.3"
        fill="#333"
      />
      <rect
        x="-56"
        y="55.5"
        width="1.5"
        height="1.5"
        rx="0.3"
        fill="#333"
      />
      <rect
        x="-56"
        y="59"
        width="1.5"
        height="1.5"
        rx="0.3"
        fill="#333"
      />

      <!-- Foregrip -->
      <path d="M-41,60.5 L-43,65 L-40,65 L-38,60.5 Z" fill="#243d50" />

      <!-- Scope -->
      <!-- Scope Mount Rings -->
      <rect
        x="-34"
        y="51"
        width="3"
        height="3"
        rx="0.5"
        fill="#1a1a1a"
      />
      <rect
        x="-24"
        y="51"
        width="3"
        height="3"
        rx="0.5"
        fill="#1a1a1a"
      />
      <!-- Scope Tube -->
      <rect
        x="-37"
        y="48"
        width="18"
        height="4.5"
        rx="2.2"
        fill="#252525"
      />
      <!-- Objective Bell -->
      <rect
        x="-39"
        y="47"
        width="3.5"
        height="6.5"
        rx="1.5"
        fill="#2e2e2e"
      />
      <!-- Scope Rear Eyepiece -->
      <rect
        x="-20"
        y="48.5"
        width="2.5"
        height="4"
        rx="1"
        fill="#2e2e2e"
      />
      <!-- Scope Turret (Windage) -->
      <rect
        x="-28"
        y="46.5"
        width="2"
        height="2"
        rx="0.5"
        fill="#333"
      />
      <!-- Scope Turret (Elevation) -->
      <rect
        x="-31"
        y="46.5"
        width="2"
        height="2"
        rx="0.5"
        fill="#333"
      />
      <!-- Front Lens -->
      <circle cx="-37.5" cy="50.2" r="2" fill="#00ccff" opacity="0.7">
        <animate
          attributeName="opacity"
          values="0.4;0.9;0.4"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <!-- Rear lens -->
      <circle cx="-19" cy="50.5" r="1" fill="#00aadd" opacity="0.3" />
      <!-- Crosshair Reflection -->
      <line
        x1="-38.5"
        y1="50.2"
        x2="-36.5"
        y2="50.2"
        stroke="#00ffff"
        stroke-width="0.3"
        opacity="0.5"
      />
      <line
        x1="-37.5"
        y1="49.2"
        x2="-37.5"
        y2="51.2"
        stroke="#00ffff"
        stroke-width="0.3"
        opacity="0.5"
      />

      <!-- Accessories -->
      <!-- Laser Sight -->
      <rect
        x="-48"
        y="60.5"
        width="3"
        height="2"
        rx="0.5"
        fill="#333333"
      />
      <circle cx="-46.5" cy="61.5" r="0.6" fill="#ff0000" opacity="0.7">
        <animate
          attributeName="opacity"
          values="0.4;0.9;0.4"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
      <!-- Light -->
      <rect
        x="-53"
        y="60.5"
        width="3"
        height="3"
        rx="0.8"
        fill="#3a3a3a"
      />
      <circle cx="-51.5" cy="62" r="1" fill="#ffff88" opacity="0.3">
        <animate
          attributeName="opacity"
          values="0.15;0.4;0.15"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>

      <!-- Muzzle Flash -->
      <circle cx="-59" cy="58" r="4" fill="#00ccff" opacity="0.35">
        <animate
          attributeName="opacity"
          values="0.15;0.5;0.15"
          dur="1s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="r"
          values="3;5;3"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
      <!-- Expanding Energy Ring -->
      <circle
        cx="-59"
        cy="58"
        r="6"
        fill="none"
        stroke="#00ccff"
        stroke-width="0.5"
        opacity="0.15"
      >
        <animate
          attributeName="r"
          values="5;8;5"
          dur="1.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.1;0.25;0.1"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
    </g>

    <!-- Right Arm -->
    <path
      d="M28,38 Q35,38 37,42 L62,43 Q64,41 64,47 L37,48 Q35,51 28,51 Z"
      fill="#1a2a3a"
    />
    <!-- Bicep -->
    <ellipse
      cx="34"
      cy="44"
      rx="7"
      ry="8"
      fill="#1a2a3a"
      stroke="#243d50"
      stroke-width="0.5"
    />
    <!-- Forearm Armor -->
    <rect
      x="42"
      y="41"
      width="16"
      height="7"
      rx="1"
      fill="#243d50"
      opacity="0.6"
    />

    <!-- Pistol -->
    <g transform="rotate(-2 62 44)">
      <!-- Slide -->
      <rect
        x="58"
        y="38"
        width="24"
        height="10"
        rx="1.5"
        fill="#0f1e2e"
      />
      <!-- Slide Top Flat -->
      <rect
        x="59"
        y="37"
        width="22"
        height="3"
        rx="0.8"
        fill="#162838"
      />
      <!-- Slide Serrations -->
      <line
        x1="74"
        y1="38"
        x2="74"
        y2="41"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="75.5"
        y1="38"
        x2="75.5"
        y2="41"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="77"
        y1="38"
        x2="77"
        y2="41"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="78.5"
        y1="38"
        x2="78.5"
        y2="41"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="80"
        y1="38"
        x2="80"
        y2="41"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <!-- Ejection Port -->
      <rect
        x="68"
        y="38.5"
        width="4"
        height="2"
        rx="0.3"
        fill="#0a1420"
      />
      <!-- Barrel -->
      <rect
        x="82"
        y="40"
        width="7"
        height="6"
        rx="0.8"
        fill="#162838"
      />
      <!-- Barrel Fluting -->
      <line
        x1="83"
        y1="41"
        x2="88"
        y2="41"
        stroke="#0f1e2e"
        stroke-width="0.3"
      />
      <line
        x1="83"
        y1="45"
        x2="88"
        y2="45"
        stroke="#0f1e2e"
        stroke-width="0.3"
      />
      <!-- Muzzle Compensator -->
      <rect
        x="88"
        y="39"
        width="3.5"
        height="8"
        rx="0.6"
        fill="#1a2a3a"
      />
      <!-- Compensator Ports -->
      <rect
        x="88.5"
        y="39.8"
        width="1.2"
        height="1.2"
        rx="0.3"
        fill="#0a1420"
      />
      <rect
        x="88.5"
        y="44.8"
        width="1.2"
        height="1.2"
        rx="0.3"
        fill="#0a1420"
      />
      <rect
        x="90"
        y="39.8"
        width="1.2"
        height="1.2"
        rx="0.3"
        fill="#0a1420"
      />
      <rect
        x="90"
        y="44.8"
        width="1.2"
        height="1.2"
        rx="0.3"
        fill="#0a1420"
      />
      <!-- Frame / Lower -->
      <rect
        x="58"
        y="48"
        width="18"
        height="5"
        rx="0.8"
        fill="#1a2a3a"
      />
      <!-- Accessory Rail -->
      <rect
        x="60"
        y="48"
        width="12"
        height="1.5"
        rx="0.3"
        fill="#0f1e2e"
      />
      <!-- Rail Teeth -->
      <line
        x1="61"
        y1="48"
        x2="61"
        y2="49"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="63"
        y1="48"
        x2="63"
        y2="49"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="65"
        y1="48"
        x2="65"
        y2="49"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="67"
        y1="48"
        x2="67"
        y2="49"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="69"
        y1="48"
        x2="69"
        y2="49"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <!-- Trigger Guard -->
      <path
        d="M64,53 Q64,58 67,58 Q70,58 70,53"
        fill="none"
        stroke="#0f1e2e"
        stroke-width="0.6"
      />
      <!-- Trigger -->
      <path d="M67,53.5 L66.5,56 L68,56 L67.5,53.5 Z" fill="#243d50" />
      <!-- Grip -->
      <rect
        x="62"
        y="53"
        width="8"
        height="10"
        rx="1.5"
        fill="#1a2a3a"
      />
      <!-- Grip Texture -->
      <line
        x1="63.5"
        y1="54"
        x2="63.5"
        y2="61.5"
        stroke="#243d50"
        stroke-width="0.3"
      />
      <line
        x1="65"
        y1="54"
        x2="65"
        y2="61.5"
        stroke="#243d50"
        stroke-width="0.3"
      />
      <line
        x1="66.5"
        y1="54"
        x2="66.5"
        y2="61.5"
        stroke="#243d50"
        stroke-width="0.3"
      />
      <line
        x1="68"
        y1="54"
        x2="68"
        y2="61.5"
        stroke="#243d50"
        stroke-width="0.3"
      />
      <!-- Grip Cross-Hatching -->
      <line
        x1="63"
        y1="55.5"
        x2="69"
        y2="55.5"
        stroke="#243d50"
        stroke-width="0.2"
      />
      <line
        x1="63"
        y1="57.5"
        x2="69"
        y2="57.5"
        stroke="#243d50"
        stroke-width="0.2"
      />
      <line
        x1="63"
        y1="59.5"
        x2="69"
        y2="59.5"
        stroke="#243d50"
        stroke-width="0.2"
      />
      <!-- Grip Base Plate -->
      <rect
        x="61.5"
        y="62"
        width="9"
        height="2"
        rx="0.5"
        fill="#0f1e2e"
      />
      <!-- Magazine -->
      <rect
        x="63"
        y="53"
        width="6"
        height="11"
        rx="0.8"
        fill="#0a1420"
        transform="rotate(2 66 58)"
      />
      <!-- Magazine Energy Strip -->
      <rect
        x="64.5"
        y="54"
        width="2.5"
        height="9"
        rx="0.4"
        fill="#00aadd"
        opacity="0.35"
        transform="rotate(2 66 58)"
      >
        <animate
          attributeName="opacity"
          values="0.2;0.5;0.2"
          dur="2s"
          repeatCount="indefinite"
        />
      </rect>
      <!-- Magazine Base -->
      <rect
        x="62.5"
        y="63.5"
        width="7"
        height="1.5"
        rx="0.4"
        fill="#162838"
        transform="rotate(2 66 58)"
      />

      <!-- Tactical Laser Module -->
      <rect
        x="60"
        y="49.5"
        width="5"
        height="2.5"
        rx="0.6"
        fill="#1a1a1a"
      />
      <circle cx="60.5" cy="50.8" r="0.6" fill="#ff0000" opacity="0.7">
        <animate
          attributeName="opacity"
          values="0.4;0.9;0.4"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>

      <!-- Rear Sight -->
      <rect
        x="75"
        y="35.5"
        width="4"
        height="2.5"
        rx="0.5"
        fill="#0a1420"
      />
      <rect
        x="75.8"
        y="35"
        width="0.8"
        height="2"
        rx="0.2"
        fill="#1a2a3a"
      />
      <rect
        x="78"
        y="35"
        width="0.8"
        height="2"
        rx="0.2"
        fill="#1a2a3a"
      />
      <!-- Front Sight -->
      <rect
        x="60"
        y="35.5"
        width="2"
        height="2.5"
        rx="0.5"
        fill="#0a1420"
      />
      <rect
        x="60.5"
        y="35"
        width="1"
        height="2"
        rx="0.2"
        fill="#1a2a3a"
      />

      <!-- Slide Detail Lines -->
      <line
        x1="59"
        y1="43"
        x2="82"
        y2="43"
        stroke="#243d50"
        stroke-width="0.3"
      />
      <line
        x1="59"
        y1="46"
        x2="76"
        y2="46"
        stroke="#1a3040"
        stroke-width="0.3"
      />

      <!-- Hammer -->
      <rect
        x="58"
        y="41"
        width="1.5"
        height="4"
        rx="0.5"
        fill="#0a1420"
      />

      <!-- Muzzle Energy Glow -->
      <circle cx="92" cy="43" r="4" fill="#00ccff" opacity="0.6">
        <animate
          attributeName="opacity"
          values="0.3;0.8;0.3"
          dur="1.2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="r"
          values="3;5;3"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </circle>
      <!-- Muzzle Flash Ring -->
      <circle
        cx="92"
        cy="43"
        r="6"
        fill="none"
        stroke="#00ccff"
        stroke-width="0.5"
        opacity="0.15"
      >
        <animate
          attributeName="r"
          values="4;8;4"
          dur="1.2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.05;0.2;0.05"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>

    <!-- Energy Beams -->
    <line
      x1="92"
      y1="44"
      x2="100"
      y2="65"
      stroke="#00ccff"
      stroke-width="2.5"
      opacity="0.5"
      stroke-dasharray="5,7"
    >
      <animate
        attributeName="opacity"
        values="0.3;0.7;0.3"
        dur="0.8s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="stroke-dashoffset"
        values="0;12"
        dur="0.5s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="92"
      y1="45"
      x2="100"
      y2="64"
      stroke="#00ddff"
      stroke-width="1"
      opacity="0.3"
      stroke-dasharray="3,9"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.4;0.1"
        dur="0.6s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="stroke-dashoffset"
        values="0;8"
        dur="0.4s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="92"
      y1="43"
      x2="100"
      y2="63"
      stroke="#00ccff"
      stroke-width="0.6"
      opacity="0.2"
      stroke-dasharray="2,10"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.3;0.05"
        dur="0.7s"
        repeatCount="indefinite"
      />
    </line>

    <!-- Legs -->
    <!-- Left -->
    <path
      d="M-1,76 Q-4,80 -4,92 L-3,108 Q-2,111 3,111 L12,111 Q15,110 14,107 L14,82 Q14,76 10,76 Z"
      fill="#1a2a3a"
    />
    <!-- Right -->
    <path
      d="M14,76 Q14,82 14,92 L14,108 Q14,111 18,111 L26,111 Q29,110 28,107 L27,82 Q27,76 22,76 Z"
      fill="#1a2a3a"
    />
    <!-- Knee Armor -->
    <ellipse
      cx="7"
      cy="91"
      rx="6"
      ry="5"
      fill="#243d50"
      opacity="0.5"
    />
    <ellipse
      cx="21"
      cy="91"
      rx="6"
      ry="5"
      fill="#243d50"
      opacity="0.5"
    />
    <!-- Shin Guards -->
    <rect
      x="0"
      y="95"
      width="10"
      height="10"
      rx="2"
      fill="#243d50"
      opacity="0.4"
    />
    <rect
      x="16"
      y="95"
      width="10"
      height="10"
      rx="2"
      fill="#243d50"
      opacity="0.4"
    />
    <!-- Boots -->
    <path
      d="M-4,107 Q-5,110 -3,112 L14,112 Q16,110 14,107 Z"
      fill="#0d1a28"
    />
    <path
      d="M14,107 Q12,110 14,112 L29,112 Q31,110 28,107 Z"
      fill="#0d1a28"
    />

    <!-- Utility Belt -->
    <rect x="-4" y="74" width="32" height="5" rx="1" fill="#243d50" />
    <!-- Buckle -->
    <rect
      x="8"
      y="74"
      width="8"
      height="5"
      rx="1"
      fill="#334466"
      opacity="0.6"
    />
    <!-- Pouches (The ultimate fanny pack :) -->
    <rect
      x="0"
      y="76"
      width="5"
      height="4"
      rx="1"
      fill="#1a2a3a"
      stroke="#243d50"
      stroke-width="0.3"
    />
    <rect
      x="19"
      y="76"
      width="5"
      height="4"
      rx="1"
      fill="#1a2a3a"
      stroke="#243d50"
      stroke-width="0.3"
    />

    <!-- Glowing Chest Badge -->
    <circle cx="12" cy="47" r="5" fill="#00ccff" opacity="0.15">
      <animate
        attributeName="opacity"
        values="0.1;0.25;0.1"
        dur="1.8s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="r"
        values="4;6;4"
        dur="1.8s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="12" cy="47" r="3" fill="#00aadd" opacity="0.7">
      <animate
        attributeName="opacity"
        values="0.5;0.9;0.5"
        dur="1.8s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="12" cy="47" r="1.5" fill="#00ddff" opacity="0.5" />
    <!-- Badge rotating clock hand -->
    <line
      x1="12"
      y1="47"
      x2="12"
      y2="44.5"
      stroke="#aaeeff"
      stroke-width="0.5"
      opacity="0.6"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 12 47;360 12 47"
        dur="4s"
        repeatCount="indefinite"
      />
    </line>
    </g>
  </svg>
`;

export class TitleHero extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

customElements.define("title-hero", TitleHero);
