require('dotenv').config(); // 冒頭で.envファイルを読み込む

// Node.js 16向けにfetchを定義するおまじない
global.fetch = require('node-fetch'); 

const { Client } = require('@notionhq/client');
const express = require('express');
const path = require('path');
const app = express();
const port = 8080;

// --- ID情報の修正箇所 ---
// 環境変数（process.env）から取得するように変更
const notion = new Client({ auth: process.env.NOTION_KEY });
const pageId = process.env.NOTION_PAGE_ID; // 公開時はサーバーの設定画面で入力

// 1. ターンの変数を定義
let turnCounter = 1;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Notionにデータを飛ばす処理
app.post('/send', async (req, res) => {
    const { order, myAction, fullMemo } = req.body;

    try {
        await notion.blocks.children.append({
            block_id: pageId, // ここが process.env.NOTION_PAGE_ID の値になります
            children: [{
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [
                        { text: { content: `T${turnCounter} ` }, annotations: { bold: true, color: "orange" } },
                        { 
                            text: { content: order === "-" ? "" : `[${order}] ` }, 
                            annotations: { bold: true, color: order === "自分先制" ? "blue" : (order === "相手先制" ? "red" : "default") } 
                        },
                        { 
                            text: { content: `${myAction || "技"} ` },
                            annotations: { color: "green" }
                        },
                        { text: { content: fullMemo || "" } }
                    ]
                }
            }]
        });

        turnCounter++;
        res.json({ nextTurn: turnCounter });

    } catch (e) {
        console.error("Notion API Error:", e.body || e);
        res.status(500).send(e.message);
    }
});

app.post('/reset', (req, res) => {
    turnCounter = 1;
    res.json({ nextTurn: 1 });
});

app.listen(port, () => console.log("--- ログ・エージェント起動完了！ ---"));
