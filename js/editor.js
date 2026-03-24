/**
 * AssetEditor - A developer tool for real-time visual tweaking.
 * Access via Shift + E in-game.
 */
export class AssetEditor {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.selectedCategory = 'enemies'; // 'enemies' | 'weapons' | 'skins'
        this.selectedId = null;
        this.tweakData = {}; 

        // UI element
        this.container = null;
        this.initUI();
    }

    initUI() {
        this.container = document.createElement('div');
        this.container.id = 'asset-editor-overlay';
        this.container.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            width: 320px;
            max-height: 80vh;
            background: rgba(10, 10, 20, 0.95);
            border: 2px solid #00f2ff;
            color: #fff;
            font-family: 'Courier New', monospace;
            padding: 15px;
            display: none;
            z-index: 10000;
            overflow-y: auto;
            box-shadow: 0 0 20px rgba(0, 242, 255, 0.3);
            border-radius: 8px;
            user-select: none;
        `;

        this.container.innerHTML = `
            <h2 style="margin: 0 0 15px 0; color: #00f2ff; font-size: 18px; text-transform: uppercase; letter-spacing: 2px;">Asset Precision v0.8.0</h2>
            
            <div style="margin-bottom: 15px;">
                <label>Category:</label>
                <select id="editor-category" style="background: #1a1a2e; color: #fff; border: 1px solid #00f2ff; width: 100%;">
                    <option value="enemies">Enemies</option>
                    <option value="weapons">Weapons</option>
                    <option value="skins">Skins</option>
                </select>
            </div>

            <div style="margin-bottom: 15px;">
                <label>Selection:</label>
                <select id="editor-selection" style="background: #1a1a2e; color: #fff; border: 1px solid #00f2ff; width: 100%;">
                    <!-- Populated dynamically -->
                </select>
            </div>

            <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;">

            <div id="editor-controls">
                <!-- Control sliders will appear here -->
            </div>

            <div style="margin-top: 20px;">
                <button id="editor-export" style="background: #00f2ff; color: #000; border: none; padding: 8px; width: 100%; cursor: pointer; font-weight: bold;">EXPORT CONFIG</button>
            </div>
            
            <p style="font-size: 10px; color: #666; margin-top: 10px;">[Shift + E] to toggle. Changes apply in real-time.</p>
        `;

        document.body.appendChild(this.container);

        // Events
        this.container.querySelector('#editor-category').addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.populateSelection();
        });

        this.container.querySelector('#editor-selection').addEventListener('change', (e) => {
            this.selectedId = e.target.value;
            this.loadCurrentAsset();
        });

        this.container.querySelector('#editor-export').addEventListener('click', () => {
            this.exportConfig();
        });

        // Prevention of game inputs while typing/interacting
        this.container.addEventListener('mousedown', (e) => e.stopPropagation());
        this.container.addEventListener('keydown', (e) => e.stopPropagation());
    }

    toggle() {
        this.active = !this.active;
        this.container.style.display = this.active ? 'block' : 'none';
        
        if (this.active) {
            this.populateSelection();
            if (this.game.unlockPointer) this.game.unlockPointer();
        } else {
            if (this.game.lockPointer) this.game.lockPointer();
        }
    }

    populateSelection() {
        const select = this.container.querySelector('#editor-selection');
        select.innerHTML = '';
        
        let targetMap = {};
        if (this.selectedCategory === 'enemies') {
            // Need to import ENEMIES from entities.js or similar
            // For now assume game has a reference
            targetMap = this.game.getAssetMetadata('enemies');
        } else if (this.selectedCategory === 'weapons') {
            targetMap = this.game.getAssetMetadata('weapons');
        }

        Object.keys(targetMap).forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = id;
            select.appendChild(opt);
        });

        if (Object.keys(targetMap).length > 0) {
            this.selectedId = Object.keys(targetMap)[0];
            this.loadCurrentAsset();
        }
    }
    loadCurrentAsset() {
        const controls = this.container.querySelector('#editor-controls');
        controls.innerHTML = '';

        const asset = this.game.getAssetConfig(this.selectedCategory, this.selectedId);
        if (!asset) return;

        // Build sliders for common properties
        this.createSlider(controls, 'Scale', 'scale', 0.1, 5.0, 0.1, asset.scale || 1.0);
        this.createSlider(controls, 'Y-Offset', 'yOffset', -2.0, 2.0, 0.05, asset.yOffset || 0);
        this.createSlider(controls, 'Anim Speed', 'animSpeed', 0.1, 20, 0.5, asset.animSpeed || 8);
        this.createSlider(controls, 'Glow Str', 'glowStrength', 0.0, 1.0, 0.05, asset.glowStrength || 0.15);
        this.createSlider(controls, 'Tech Opacity', 'techLineOpacity', 0.0, 1.0, 0.05, asset.techLineOpacity || 0.3);
        this.createColorPicker(controls, 'Primary Tint', 'color1', asset.color1 || '#ffffff');
    }

    createSlider(parent, label, key, min, max, step, current) {
        const div = document.createElement('div');
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <label>${label}</label>
                <span id="val-${key}">${current}</span>
            </div>
            <input type="range" min="${min}" max="${max}" step="${step}" value="${current}" style="width: 100%;">
        `;
        const input = div.querySelector('input');
        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            div.querySelector(`#val-${key}`).textContent = val;
            this.updateAsset(key, val);
        });
        parent.appendChild(div);
    }

    createColorPicker(parent, label, key, current) {
        const div = document.createElement('div');
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <label>${label}</label>
            </div>
            <input type="color" value="${current}" style="width: 100%; border: 1px solid #333; background: none; cursor: pointer;">
        `;
        const input = div.querySelector('input');
        input.addEventListener('input', (e) => {
            this.updateAsset(key, e.target.value);
        });
        parent.appendChild(div);
    }

    updateAsset(key, val) {
        this.game.updateAssetLive(this.selectedCategory, this.selectedId, key, val);
    }

    exportConfig() {
        const config = this.game.getAssetConfig(this.selectedCategory, this.selectedId);
        const json = JSON.stringify(config, null, 2);
        console.log(`[ASSET EDITOR] Exported ${this.selectedId}:`, json);
        
        // Copy to clipboard
        navigator.clipboard.writeText(json).then(() => {
            alert(`Config for ${this.selectedId} copied to clipboard!`);
        });
    }
}
