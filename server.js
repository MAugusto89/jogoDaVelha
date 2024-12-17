const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

// Servir arquivos estáticos da pasta atual
app.use(express.static(__dirname));

let players = [];
let boardState = Array(9).fill(null);
let currentPlayer = "X";

io.on("connection", (socket) => {
  console.log("Novo jogador conectado:", socket.id);

  // Gerenciar entrada dos jogadores
  socket.on("joinGame", () => {
    if (players.length < 2) {
      players.push({ id: socket.id, symbol: players.length === 0 ? "X" : "O" });
      socket.emit("assignSymbol", players[players.length - 1].symbol);
      io.emit("playerJoined", players.length);

      if (players.length === 2) {
        io.emit("startGame");
      }
    }
  });

  // Gerenciar jogadas
  socket.on("makeMove", (index) => {
    const player = players.find((p) => p.id === socket.id);
    if (!player || boardState[index] || currentPlayer !== player.symbol) return;

    boardState[index] = player.symbol;
    currentPlayer = currentPlayer === "X" ? "O" : "X";

    io.emit("updateBoard", boardState, currentPlayer);

    // Verificar condição de vitória
    const winner = checkWin();
    if (winner) {
      io.emit("gameOver", `Jogador ${winner} venceu!`);
      resetGame();
    } else if (boardState.every((cell) => cell)) {
      io.emit("gameOver", "Empate!");
      resetGame();
    }
  });

  // Reiniciar o jogo
  socket.on("restartGame", () => {
    resetGame();
    io.emit("restartGame");
  });

  socket.on("disconnect", () => {
    console.log("Jogador desconectado:", socket.id);
    players = players.filter((p) => p.id !== socket.id);
    resetGame();
    io.emit("playerJoined", players.length);
  });
});

function checkWin() {
  const winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (
      boardState[a] &&
      boardState[a] === boardState[b] &&
      boardState[a] === boardState[c]
    ) {
      return boardState[a];
    }
  }
  return null;
}

function resetGame() {
  boardState = Array(9).fill(null);
  currentPlayer = "X";
}

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
