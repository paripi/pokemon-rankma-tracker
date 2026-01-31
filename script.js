// --- 設定・定数 ---
const STATUS_ORDER = [null, 'selected', 'now', 'fainted', 'bench'];
const MY_STATUS_ORDER = [null, 'now', 'fainted']; 
const SELECT_COUNT = 3;

let enemyStates = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null };
let myStates = { 0: "now", 1: "selected", 2: "selected" };
let myTeraStates = { 0: false, 1: false, 2: false };
let selectedMove = ""; // 選択中の技名を保持

const MY_POKEMON_DATA = {
    "ザシアン": { moves: ["きょじゅうざん", "じゃれつく", "テラバースト", "くさわけ"], tera: "水" },
    "黒バドレックス": { moves: ["アストラルビット", "くさむすび", "テラバースト", "わるだくみ"], tera: "じめん" },
    "カイリュー": { moves: ["げきりん", "しんそく", "じしん", "からげんき"], tera: "ノーマル" },
    "カバルドン": { moves: ["じならし", "あくび", "ステルスロック", "ふきとばし"], tera: "ノーマル" },
    "キョジオーン": { moves: ["しおづけ", "みがわり", "のろい", "じこさいせい"], tera: "ゴースト" },
    "アシレーヌ": { moves: ["うたかたのアリア", "ムーンフォース", "アクアジェット", "シャドーボール"], tera: "ノーマル" }
};

// --- 初期化 ---
window.onload = () => {
    const savedEnemy = localStorage.getItem('enemy_states');
    if (savedEnemy) {
        enemyStates = JSON.parse(savedEnemy);
        Object.keys(enemyStates).forEach(id => renderEnemyStatus(Number(id), enemyStates[id]));
    }
    const savedMy = localStorage.getItem('my_states');
    if (savedMy) {
        myStates = JSON.parse(savedMy);
        Object.keys(myStates).forEach(id => renderMyStatus(Number(id), myStates[id]));
    }
    const savedTera = localStorage.getItem('my_tera_states');
    if (savedTera) {
        myTeraStates = JSON.parse(savedTera);
    }
    updateMoveButtons();
};

// --- 送信ボタンの処理 ---
document.getElementById('sendBtn').addEventListener('click', async () => {
    const turnLabel = document.getElementById('turnLabel').innerText;
    const order = document.querySelector('input[name="order"]:checked')?.value || "-";
    const actionType = document.querySelector('input[name="my-action"]:checked').value;
    const nextNowInput = document.getElementById('nextNow');
    const nextNowValue = nextNowInput.value ?? "";
    const enemyActionType = document.querySelector('input[name="enemy-action"]:checked').value;
    const otherInfoInput = document.getElementById('otherInfo');
    const otherInfo = otherInfoInput.value ?? "";

    const myNowId = Object.keys(myStates).find(id => myStates[id] === 'now');

    let actionContent = "";
    if (actionType === "技") {
        const pkmnName = document.getElementById("my-" + (Number(myNowId) + 1)).innerText;
        // テラス
        let teraSuffix = "";
        if (myNowId !== undefined && myTeraStates[myNowId] && actionType === "技") {
            const data = MY_POKEMON_DATA[pkmnName];
            teraSuffix = "【テラ済(" + data.tera + ")】";
        }
        // 内容まとめ
        actionContent = selectedMove ? "(" + pkmnName + ")" + selectedMove + teraSuffix : "(技未選択)";
    } else {
        actionContent = nextNowValue || "(交代先未選択)";
    }
    const myAction = "【" + actionType + "】" + actionContent;

    const enemyNowId = Object.keys(enemyStates).find(id => enemyStates[id] === 'now');
    let enemyInfo = enemyNowId !== undefined ? `(vs ${document.getElementById("enemy-" + (Number(enemyNowId) + 1)).innerText}【${enemyActionType}】) ` : "";
    const fullMemo = enemyInfo + otherInfo;

    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    btn.innerText = '送信中...';

    try {
        const res = await fetch('/send', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ order, myAction, fullMemo })
        });
        
        if (res.ok) {
            const data = await res.json();
            document.getElementById('turnLabel').innerText = `T${data.nextTurn} の記録`;
            
            if (actionType === "交代") {
                [0, 1, 2].forEach(id => {
                    const pkmnName = document.getElementById("my-" + (id + 1)).innerText;
                    if (nextNowValue === pkmnName) setMyNow(id); 
                });
            }

            addLogToDisplay(turnLabel.split(' ')[0], order, myAction, fullMemo);

            // リセット
            nextNowInput.value = "";
            otherInfoInput.value = "";
            document.querySelector('input[name="order"][value="-"]').checked = true;
            document.querySelector('input[name="my-action"][value="技"]').checked = true;
            document.querySelector('input[name="enemy-action"][value="技"]').checked = true;
            selectedMove = ""; 
            updateMoveButtons();
        }
    } catch (e) {
        alert("送信失敗！");
    } finally {
        btn.disabled = false;
        btn.innerText = 'Notionへ記録！';
    }
});

// --- 自分のパーティ管理 ---
function handleMyToggle(id) {
    const pkmnName = document.getElementById("my-" + (id + 1)).innerText;
    document.getElementById('nextNow').value = pkmnName;
    document.querySelector('input[name="my-action"][value="交代"]').checked = true;
    selectedMove = "";
    updateMoveButtons(); // 表示を強制切り替え
}

function setMyNow(id) {
    Object.keys(myStates).forEach(key => {
        if (myStates[key] === 'now') updateMyStatus(Number(key), "selected");
    });
    updateMyStatus(id, 'now');
    updateMoveButtons();
}

function updateMyStatus(id, status) {
    myStates[id] = status;
    renderMyStatus(id, status);
    localStorage.setItem('my_states', JSON.stringify(myStates));
}

function renderMyStatus(id, status) {
    const btn = document.getElementById("my-" + (id + 1));
    if (!btn) return;
    btn.classList.remove('now', 'fainted', 'tera-active');
    if (status) btn.classList.add(status);
    if (myTeraStates[id]) btn.classList.add('tera-active');
}

// --- 相手パーティ管理 ---
function handleToggle(id) {
    const currentIdx = STATUS_ORDER.indexOf(enemyStates[id]);
    const nextIdx = (currentIdx + 1) % STATUS_ORDER.length;
    const nextStatus = STATUS_ORDER[nextIdx];
    if (nextStatus === 'now') {
        Object.keys(enemyStates).forEach(key => {
            if (enemyStates[key] === 'now') updateEnemyStatus(Number(key), 'selected');
        });
    }
    updateEnemyStatus(id, nextStatus);
    completeSelect() ? updateBench() : resetBench();
}

function updateEnemyStatus(id, status) {
    enemyStates[id] = status;
    renderEnemyStatus(id, status);
    localStorage.setItem('enemy_states', JSON.stringify(enemyStates));
}

function renderEnemyStatus(id, status) {
    const btn = document.getElementById("enemy-" + (id + 1));
    if (!btn) return;
    btn.classList.remove('bench', 'selected', 'now', 'fainted');
    if (status) btn.classList.add(status);
}

function completeSelect() {
    return Object.values(enemyStates).filter(s => ['selected', 'now', 'fainted'].includes(s)).length >= SELECT_COUNT;
}

function updateBench() {
    Object.keys(enemyStates).forEach(id => {
        if (!['selected', 'now', 'fainted'].includes(enemyStates[id])) updateEnemyStatus(Number(id), 'bench');
    });
}

function resetBench() {
    Object.keys(enemyStates).forEach(id => {
        if (enemyStates[id] === 'bench') updateEnemyStatus(Number(id), null);
    });
}

// --- 技・UI連動 ---
function updateMoveButtons() {
    const container = document.getElementById('moveContainer');
    const teraContainer = document.getElementById('teraContainer');
    const nextNowInput = document.getElementById('nextNow');
    const moveTitle = document.getElementById('moveTitle');
    const actionType = document.querySelector('input[name="my-action"]:checked')?.value;

    container.innerHTML = ""; 
    teraContainer.innerHTML = "";

    const nowId = Object.keys(myStates).find(id => myStates[id] === 'now');
    if (nowId === undefined) {
        if (moveTitle) moveTitle.innerText = "出撃中のポケモンがいません";
        return;
    }

    // 表示切り替え
    if (actionType === "技") {
        nextNowInput.style.display = "none";
        container.style.display = "grid";
        teraContainer.style.display = "grid";
        if (moveTitle) moveTitle.style.display = "block";
    } else {
        nextNowInput.style.display = "block";
        container.style.display = "none";
        teraContainer.style.display = "none";
        if (moveTitle) moveTitle.style.display = "none";
    }

    const pkmnName = document.getElementById("my-" + (Number(nowId) + 1)).innerText;
    const data = MY_POKEMON_DATA[pkmnName];
    if (!data) return;

    if (moveTitle) moveTitle.innerText = `${pkmnName} の技`;

    // 技ボタン生成
    data.moves.forEach(move => {
        const btn = document.createElement('button');
        btn.type = "button";
        btn.className = "move-btn";
        if (selectedMove === move) btn.classList.add('selected-move');
        btn.innerText = move;
        btn.onclick = () => {
            selectedMove = move;
            document.querySelector('input[name="my-action"][value="技"]').checked = true;
            document.querySelectorAll('.move-btn').forEach(b => b.classList.remove('selected-move'));
            btn.classList.add('selected-move');
        };
        container.appendChild(btn);
    });

    // テラスタルボタン
    const tBtn = document.createElement('button');
    tBtn.type = "button";
    const isTera = myTeraStates[nowId];
    tBtn.className = isTera ? "tera-btn active" : "tera-btn";
    tBtn.innerText = isTera ? `テラ済み(${data.tera})` : `テラスタルする(${data.tera})`;
    tBtn.onclick = () => {
        myTeraStates[nowId] = !myTeraStates[nowId];
        localStorage.setItem('my_tera_states', JSON.stringify(myTeraStates));
        updateMoveButtons();
        renderMyStatus(Number(nowId), 'now'); 
    };
    teraContainer.appendChild(tBtn);
}

// ラジオボタン切り替えイベント
document.querySelectorAll('input[name="my-action"]').forEach(radio => {
    radio.addEventListener('change', () => {
        if (document.querySelector('input[name="my-action"]:checked').value === "交代") {
            selectedMove = ""; 
        }
        updateMoveButtons();
    });
});

// --- ログ・補助機能 ---
function addLogToDisplay(turn, order, type, text) {
    const logDisplay = document.getElementById('logDisplay');
    const placeholder = logDisplay.querySelector('.log-placeholder');
    if (placeholder) placeholder.remove();
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.innerHTML = `<strong>${turn}</strong> [${order}] ${type}: ${text}`;
    logDisplay.prepend(logItem);
}

document.getElementById('resetBtn').addEventListener('click', async () => {
    if(confirm('全ての状態とターン数をリセットしますか？')) {
        // 1. サーバー側のターン数をリセット
        await fetch('/reset', { method: 'POST' });

        // 2. ローカルストレージを一度空にする
        localStorage.clear();

        // 3. 【重要】リセット直後の「理想の初期状態」をストレージに書き込む
        const defaultStates = { 0: "now", 1: "selected", 2: "selected" };
        const defaultTera = { 0: false, 1: false, 2: false };
        
        localStorage.setItem('my_states', JSON.stringify(defaultStates));
        localStorage.setItem('my_tera_states', JSON.stringify(defaultTera));

        // 4. 再読み込み（これで window.onload が走り、上記の初期値が読み込まれる）
        location.reload();
    }
});