/* ==========================================
   GAME.JS - Sudoku Minimalista de Luxo Lógica
   ========================================== */

// Estado global do jogo
const gameState = {
  board: [],          // 9x9 - estado atual (com entradas do jogador)
  solution: [],       // 9x9 - solução completa
  fixed: [],          // 9x9 booleano - pré-preenchidas (não editáveis)
  difficulty: 'medium', // 'easy' | 'medium' | 'hard'
  errors: 0,          // máximo 3
  score: 0,
  timer: 0,
  isPaused: false,
  timerInterval: null,
  selectedCell: { r: -1, c: -1 }
};

// Histórico de partidas em localStorage
let userHistory = JSON.parse(localStorage.getItem('sudoku_history')) || [];
let currentUser = JSON.parse(localStorage.getItem('sudoku_user')) || null;

// ----- ALGORITMO DO SUDOKU (GERADOR E SOLVER) -----

// Verifica se num é seguro na linha, coluna e caixa 3x3
function isSafe(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false;
    if (board[x][col] === num) return false;
  }
  
  let startRow = row - row % 3;
  let startCol = col - col % 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }
  return true;
}

// Preenche o tabuleiro usando backtracking recursivo
function fillBoard(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        // Shuffler
        for (let i = numbers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        for (let num of numbers) {
          if (isSafe(board, row, col, num)) {
            board[row][col] = num;
            if (fillBoard(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// Conta o número de soluções de um tabuleiro (usado para verificar unicidade)
function countSolutions(board) {
  let solutions = 0;
  
  function solve(r, c) {
    if (r === 9) {
      solutions++;
      return;
    }
    let nextR = c === 8 ? r + 1 : r;
    let nextC = c === 8 ? 0 : c + 1;
    
    if (board[r][c] !== 0) {
      solve(nextR, nextC);
      return;
    }
    
    for (let num = 1; num <= 9; num++) {
      if (isSafe(board, r, c, num)) {
        board[r][c] = num;
        solve(nextR, nextC);
        board[r][c] = 0;
        if (solutions > 1) return; // Atalho se houver mais de uma solução
      }
    }
  }
  
  solve(0, 0);
  return solutions;
}

// Gera um tabuleiro Sudoku com solução única
function generateSudoku(difficulty) {
  // 1. Cria tabuleiro vazio e resolve
  let baseBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillBoard(baseBoard);
  gameState.solution = baseBoard.map(row => [...row]);
  
  // 2. Define o alvo de células restantes
  let targetClues;
  if (difficulty === 'easy') {
    targetClues = Math.floor(Math.random() * 6) + 35; // 35 a 40 revelados
  } else if (difficulty === 'medium') {
    targetClues = Math.floor(Math.random() * 8) + 27; // 27 a 34 revelados
  } else {
    targetClues = Math.floor(Math.random() * 7) + 20; // 20 a 26 revelados
  }
  
  // 3. Embaralha posições de remoção
  let puzzle = baseBoard.map(row => [...row]);
  let coords = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      coords.push({ r, c });
    }
  }
  for (let i = coords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [coords[i], coords[j]] = [coords[j], coords[i]];
  }
  
  let targetRemove = 81 - targetClues;
  let removed = 0;
  
  for (let cell of coords) {
    if (removed >= targetRemove) break;
    
    let val = puzzle[cell.r][cell.c];
    puzzle[cell.r][cell.c] = 0;
    
    // Se ainda for solução única, mantém removido
    if (countSolutions(puzzle) === 1) {
      removed++;
    } else {
      puzzle[cell.r][cell.c] = val; // restaura
    }
  }
  
  // Define o tabuleiro de jogo
  gameState.board = puzzle.map(row => [...row]);
  gameState.fixed = puzzle.map(row => row.map(cell => cell !== 0));
}

// ----- INTERFACE E CONTROLES DO JOGO -----

// Abre o modal de escolha de dificuldade
function showDifficultyModal() {
  document.getElementById('modal-difficulty').classList.add('active');
}

// Fecha o modal de dificuldade
function closeDifficultyModal() {
  document.getElementById('modal-difficulty').classList.remove('active');
}

// Inicia um novo jogo
function startGame(difficulty) {
  closeDifficultyModal();
  gameState.difficulty = difficulty;
  gameState.errors = 0;
  gameState.score = 0;
  gameState.timer = 0;
  gameState.isPaused = false;
  gameState.selectedCell = { r: -1, c: -1 };
  
  // Atualiza painel de status
  document.getElementById('game-difficulty-display').innerText = getDifficultyLabel(difficulty);
  document.getElementById('footer-difficulty').innerText = getDifficultyLabel(difficulty);
  updateScoreDisplay();
  updateErrorsDisplay();
  
  // Gera o tabuleiro
  generateSudoku(difficulty);
  
  // Cria elementos no HTML
  renderBoard();
  
  // Esconde tela inicial, mostra tela de jogo
  document.getElementById('screen-home').classList.add('hidden');
  document.getElementById('screen-game').classList.remove('hidden');
  
  // Inicia timer
  startTimer();
}

// Retorna texto da dificuldade formatado
function getDifficultyLabel(difficulty) {
  if (difficulty === 'easy') return 'Fácil';
  if (difficulty === 'medium') return 'Médio';
  return 'Difícil';
}

// Reinicia a partida atual com a mesma dificuldade e tabuleiro original
function restartCurrentGame() {
  document.getElementById('modal-gameover').classList.remove('active');
  gameState.errors = 0;
  gameState.score = 0;
  gameState.timer = 0;
  gameState.isPaused = false;
  gameState.selectedCell = { r: -1, c: -1 };
  
  // Limpa entradas do jogador e mantém fixas
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!gameState.fixed[r][c]) {
        gameState.board[r][c] = 0;
      }
    }
  }
  
  updateScoreDisplay();
  updateErrorsDisplay();
  renderBoard();
  startTimer();
}

// Volta para a tela inicial
function backToHome() {
  // Fecha modais ativos
  document.getElementById('modal-gameover').classList.remove('active');
  document.getElementById('modal-victory').classList.remove('active');
  document.getElementById('modal-pause').classList.remove('active');
  
  clearInterval(gameState.timerInterval);
  
  document.getElementById('screen-game').classList.add('hidden');
  document.getElementById('screen-home').classList.remove('hidden');
  
  updateHistoryButtonVisibility();
}

// Renderiza visualmente o grid 9x9 no DOM
function renderBoard() {
  const boardEl = document.getElementById('sudoku-board');
  boardEl.innerHTML = '';
  
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cellEl = document.createElement('div');
      cellEl.classList.add('sudoku-cell');
      cellEl.dataset.row = r;
      cellEl.dataset.col = c;
      cellEl.tabIndex = 0; // Permite foco
      
      const val = gameState.board[r][c];
      
      if (gameState.fixed[r][c]) {
        cellEl.classList.add('fixed');
        cellEl.innerText = val;
      } else {
        cellEl.classList.add('player-input');
        if (val !== 0) {
          cellEl.innerText = val;
          // Verifica se está certo ou errado comparando com a solução
          if (val === gameState.solution[r][c]) {
            cellEl.classList.add('correct');
          } else {
            cellEl.classList.add('incorrect');
          }
        }
      }
      
      // Evento de clique / seleção
      cellEl.addEventListener('click', () => selectCell(r, c));
      
      boardEl.appendChild(cellEl);
    }
  }
}

// Seleciona uma célula e aplica destaque de linha, coluna e bloco
function selectCell(r, c) {
  if (gameState.isPaused) return;
  
  gameState.selectedCell = { r, c };
  
  const cells = document.querySelectorAll('.sudoku-cell');
  const selectedVal = gameState.board[r][c];
  
  cells.forEach(cell => {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    // Remove classes anteriores
    cell.classList.remove('selected', 'highlighted', 'value-highlight');
    
    // Adiciona classe na selecionada
    if (row === r && col === c) {
      cell.classList.add('selected');
    } 
    // Destaque de linha, coluna e bloco 3x3
    else if (row === r || col === c || (Math.floor(row / 3) === Math.floor(r / 3) && Math.floor(col / 3) === Math.floor(c / 3))) {
      cell.classList.add('highlighted');
    }
    
    // Destaque do mesmo valor
    if (selectedVal !== 0 && gameState.board[row][col] === selectedVal) {
      cell.classList.add('value-highlight');
    }
  });
}

// Move seleção usando as setas do teclado
function moveSelection(direction) {
  let { r, c } = gameState.selectedCell;
  if (r === -1 || c === -1) {
    selectCell(0, 0);
    return;
  }
  
  if (direction === 'ArrowUp' && r > 0) r--;
  else if (direction === 'ArrowDown' && r < 8) r++;
  else if (direction === 'ArrowLeft' && c > 0) c--;
  else if (direction === 'ArrowRight' && c < 8) c++;
  
  selectCell(r, c);
  
  // Foca elemento correspondente para melhor acessibilidade
  const targetEl = document.querySelector(`.sudoku-cell[data-row="${r}"][data-col="${c}"]`);
  if (targetEl) targetEl.focus();
}

// Trata entrada de teclado físico
document.addEventListener('keydown', (e) => {
  if (gameState.isPaused || document.getElementById('screen-game').classList.contains('hidden')) return;
  
  const { r, c } = gameState.selectedCell;
  if (r === -1 || c === -1) return;
  
  // Seta de navegação
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    moveSelection(e.key);
    return;
  }
  
  // Digitar número (1-9)
  if (e.key >= '1' && e.key <= '9') {
    inputNumber(r, c, parseInt(e.key));
  }
  // Apagar número
  else if (e.key === 'Backspace' || e.key === 'Delete') {
    inputNumber(r, c, 0);
  }
});

// Trata clique do teclado virtual (Mobile)
function handleKeypadInput(num) {
  const { r, c } = gameState.selectedCell;
  if (r === -1 || c === -1) return;
  
  if (num === null) {
    inputNumber(r, c, 0); // Apagar
  } else {
    inputNumber(r, c, num); // Inserir 1-9
  }
}

// Executa a lógica de inserção e pontuação do número
function inputNumber(r, c, num) {
  // Células fixas não podem ser alteradas
  if (gameState.fixed[r][c]) return;
  
  // Se for igual ao atual, não faz nada
  if (gameState.board[r][c] === num) return;
  
  const cellEl = document.querySelector(`.sudoku-cell[data-row="${r}"][data-col="${c}"]`);
  
  if (num === 0) {
    // Apagar número (se não estiver correto para não permitir trapaça)
    if (gameState.board[r][c] !== 0 && gameState.board[r][c] !== gameState.solution[r][c]) {
      gameState.board[r][c] = 0;
      cellEl.innerText = '';
      cellEl.className = 'sudoku-cell player-input selected'; // limpa corretos/incorretos
    }
    return;
  }
  
  gameState.board[r][c] = num;
  cellEl.innerText = num;
  cellEl.className = 'sudoku-cell player-input selected';
  
  // Verifica acerto / erro
  const isCorrect = (num === gameState.solution[r][c]);
  
  if (isCorrect) {
    cellEl.classList.add('correct');
    cellEl.classList.add('animate-pulse');
    
    // Adiciona pontos
    let points = 100;
    if (gameState.difficulty === 'medium') points = 200;
    if (gameState.difficulty === 'hard') points = 350;
    gameState.score += points;
    
    // Remove animação de pulso após concluir
    setTimeout(() => cellEl.classList.remove('animate-pulse'), 400);
    
    // Verifica vitória
    checkVictory();
  } else {
    cellEl.classList.add('incorrect');
    cellEl.classList.add('animate-shake');
    
    // Decrementa pontos
    let penalty = 150;
    if (gameState.difficulty === 'medium') penalty = 300;
    if (gameState.difficulty === 'hard') penalty = 500;
    gameState.score = Math.max(0, gameState.score - penalty);
    
    // Incrementa erros
    gameState.errors++;
    updateErrorsDisplay();
    
    setTimeout(() => cellEl.classList.remove('animate-shake'), 350);
    
    // Verifica fim de jogo
    if (gameState.errors >= 3) {
      triggerGameOver();
    }
  }
  
  updateScoreDisplay();
  
  // Atualiza highlights de valores duplicados na tela
  selectCell(r, c);
}

// Atualiza o painel de erros
function updateErrorsDisplay() {
  const heartsEl = document.getElementById('error-hearts');
  if (gameState.errors === 0) heartsEl.innerText = '❤️❤️❤️';
  else if (gameState.errors === 1) heartsEl.innerText = '❤️❤️💔';
  else if (gameState.errors === 2) heartsEl.innerText = '❤️💔💔';
  else heartsEl.innerText = '💔💔💔';
}

// Atualiza o painel de score
function updateScoreDisplay() {
  document.getElementById('game-score-display').innerText = String(gameState.score).padStart(4, '0');
}

// Temporizador
function startTimer() {
  clearInterval(gameState.timerInterval);
  gameState.timerInterval = setInterval(() => {
    if (!gameState.isPaused) {
      gameState.timer++;
      updateTimerDisplay();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(gameState.timer / 60);
  const seconds = gameState.timer % 60;
  document.getElementById('game-timer').innerText = 
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Lógica de Pausa
function pauseGame() {
  gameState.isPaused = true;
  document.getElementById('sudoku-board').style.opacity = '0';
  document.getElementById('modal-pause').classList.add('active');
}

function resumeGame() {
  gameState.isPaused = false;
  document.getElementById('sudoku-board').style.opacity = '1';
  document.getElementById('modal-pause').classList.remove('active');
}

// Fim de Jogo (Derrota)
function triggerGameOver() {
  clearInterval(gameState.timerInterval);
  document.getElementById('gameover-score').innerText = gameState.score;
  document.getElementById('modal-gameover').classList.add('active');
  
  // Registra no histórico como derrota
  saveGameToHistory(false);
}

// Verifica se todas as células estão corretas
function checkVictory() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (gameState.board[r][c] !== gameState.solution[r][c]) {
        return; // Falta alguma célula ou tem erros ativos
      }
    }
  }
  
  // Vitória detectada!
  clearInterval(gameState.timerInterval);
  
  // Adiciona bônus de tempo
  const timeBonus = Math.max(0, 5000 - gameState.timer * 2);
  gameState.score += timeBonus;
  updateScoreDisplay();
  
  // Mostra modal de vitória
  const minutes = Math.floor(gameState.timer / 60);
  const seconds = gameState.timer % 60;
  document.getElementById('victory-time').innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  document.getElementById('victory-score').innerText = gameState.score;
  document.getElementById('victory-difficulty').innerText = getDifficultyLabel(gameState.difficulty);
  
  const noticeEl = document.getElementById('victory-login-notice');
  if (currentUser) {
    noticeEl.classList.remove('hidden');
    document.getElementById('btn-victory-history').classList.remove('hidden');
  } else {
    noticeEl.classList.add('hidden');
    document.getElementById('btn-victory-history').classList.add('hidden');
  }
  
  document.getElementById('modal-victory').classList.add('active');
  
  // Salva no histórico como vitória
  saveGameToHistory(true);
}

// ----- HISTÓRICO E PERSISTÊNCIA -----

// Salva partida no histórico
function saveGameToHistory(isWin) {
  const minutes = Math.floor(gameState.timer / 60);
  const seconds = gameState.timer % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  const gameRecord = {
    date: new Date().toLocaleDateString('pt-BR'),
    difficulty: getDifficultyLabel(gameState.difficulty),
    time: timeStr,
    score: gameState.score,
    result: isWin ? 'Vitória' : 'Derrota',
    email: currentUser ? currentUser.email : 'local'
  };
  
  userHistory.unshift(gameRecord); // Adiciona no início
  localStorage.setItem('sudoku_history', JSON.stringify(userHistory));
  
  // Se estiver logado, simula chamada à API do Google Play Games Services
  if (currentUser && isWin) {
    console.log(`[Google Play Games Mock] Submetendo score de ${gameState.score} para o leaderboard!`);
  }
}

// Abre o modal de Histórico
function showHistoryModal() {
  document.getElementById('modal-victory').classList.remove('active');
  const rowsEl = document.getElementById('history-rows');
  const emptyEl = document.getElementById('history-empty-msg');
  rowsEl.innerHTML = '';
  
  // Filtra histórico dependendo se está logado ou não
  const filteredHistory = userHistory.filter(record => {
    if (currentUser) return record.email === currentUser.email;
    return record.email === 'local';
  });
  
  if (filteredHistory.length === 0) {
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
    filteredHistory.forEach(record => {
      const tr = document.createElement('tr');
      
      const tdDate = document.createElement('td');
      tdDate.innerText = record.date;
      
      const tdDiff = document.createElement('td');
      tdDiff.innerText = record.difficulty;
      
      const tdTime = document.createElement('td');
      tdTime.innerText = record.time;
      
      const tdScore = document.createElement('td');
      tdScore.innerText = record.score;
      tdScore.classList.add('monospace-font');
      
      const tdResult = document.createElement('td');
      tdResult.innerText = record.result;
      tdResult.classList.add(record.result === 'Vitória' ? 'win' : 'loss');
      
      tr.appendChild(tdDate);
      tr.appendChild(tdDiff);
      tr.appendChild(tdTime);
      tr.appendChild(tdScore);
      tr.appendChild(tdResult);
      
      rowsEl.appendChild(tr);
    });
  }
  
  document.getElementById('modal-history').classList.add('active');
}

function closeHistoryModal() {
  document.getElementById('modal-history').classList.remove('active');
}

// Atualiza a visibilidade do botão de histórico da tela inicial
function updateHistoryButtonVisibility() {
  const btn = document.getElementById('btn-show-history');
  
  // Filtra histórico para checar se há registros locais ou do usuário atual
  const filteredHistory = userHistory.filter(record => {
    if (currentUser) return record.email === currentUser.email;
    return record.email === 'local';
  });
  
  if (filteredHistory.length > 0) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

// ----- INTEGRAÇÃO GOOGLE LOGIN -----

// Callback da credencial de Login do Google
function handleCredentialResponse(response) {
  // Decodifica o JWT retornado pelo Google
  const responsePayload = decodeJwtResponse(response.credential);
  
  currentUser = {
    name: responsePayload.name,
    email: responsePayload.email,
    picture: responsePayload.picture
  };
  
  localStorage.setItem('sudoku_user', JSON.stringify(currentUser));
  
  updateUserUI();
  updateHistoryButtonVisibility();
}

// Decodificador de JWT sutil
function decodeJwtResponse(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}

// Atualiza o estado visual do botão / avatar do usuário
function updateUserUI() {
  const loginContainer = document.getElementById('google-login-container');
  const userProfile = document.getElementById('user-profile');
  
  if (currentUser) {
    loginContainer.classList.add('hidden');
    userProfile.classList.remove('hidden');
    
    document.getElementById('user-avatar').src = currentUser.picture;
    document.getElementById('user-name-display').innerText = currentUser.name;
  } else {
    loginContainer.classList.remove('hidden');
    userProfile.classList.add('hidden');
  }
}

// Logout do Google
function logoutGoogle() {
  currentUser = null;
  localStorage.removeItem('sudoku_user');
  updateUserUI();
  updateHistoryButtonVisibility();
}

// Fechar modais ao clicar no fundo (Overlay)
function closeModalOnBg(e) {
  if (e.target.classList.contains('modal-overlay')) {
    resumeGame(); // Se for o de pausa
  }
}

// Inicializações adicionais ao carregar
window.addEventListener('DOMContentLoaded', () => {
  updateUserUI();
  updateHistoryButtonVisibility();
});
