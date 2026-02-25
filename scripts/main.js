let boards = JSON.parse(localStorage.getItem('tileBoards')) || {};

let currentBoard = {
    id: null,
    name: 'Моя доска',
    rows: 3,
    cols: 4,
    tiles: []
};

let selectedTileIndex = null;
let resizeObserver = null;
let isViewMode = false;
let updateTimeout = null;
let lastUsedColor = '#E8E8E8';
let lastTileHadTitle = false;

let animationInterval = null;
let popupTimeout = null;

const defaultColor = '#E8E8E8';

const colorPalette = [
    { name: 'Светло-серый', color: '#E8E8E8', emoji: '🐘' },
    { name: 'Персиковый', color: '#FFB7A5', emoji: '🍑' },
    { name: 'Лавандовый', color: '#B8A9D1', emoji: '🍇' },
    { name: 'Ванильный', color: '#FFF2B5', emoji: '🍦' },
    { name: 'Небесный', color: '#9DC3E6', emoji: '☁️' },
    { name: 'Мятно-зеленый', color: '#98D9B6', emoji: '🍃' },
    { name: 'Розовый', color: '#FFB6C1', emoji: '🎀' }
];

document.addEventListener('DOMContentLoaded', () => {
    initializeColorPalette();
    updateBoardsList();
    
    const urlParams = new URLSearchParams(window.location.search);
    const boardId = urlParams.get('board');
    
    if (boardId && boards[boardId]) {
        isViewMode = true;
        document.body.classList.add('view-mode');
        document.querySelector('.container').classList.add('view-mode');
        document.getElementById('mainContent').classList.add('view-mode');
        loadBoard(boardId, true);
        
        // Запускаем случайную анимацию в режиме просмотра
        startRandomAnimation();
    } else {
        createBoard(3, 4);
        setTimeout(() => {
            selectedTileIndex = 0;
            showTileEditor(0);
        }, 200);
    }
    
    setupEventListeners();
    setupResizeObserver();
    window.addEventListener('load', adjustTileSizes);
    window.addEventListener('resize', adjustTileSizes);
});

function initializeColorPalette() {
    const colorPresets = document.getElementById('colorPresets');
    if (!colorPresets) return;
    
    colorPresets.innerHTML = '';
    
    colorPalette.forEach(preset => {
        const option = document.createElement('div');
        option.className = 'color-option';
        option.style.backgroundColor = preset.color;
        option.dataset.color = preset.color;
        option.title = preset.name;
        option.textContent = preset.emoji;
        
        option.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
            lastUsedColor = this.dataset.color;
        });
        
        colorPresets.appendChild(option);
    });
}

function setupEventListeners() {
    document.getElementById('createBoard').addEventListener('click', (e) => {
        e.preventDefault();
        updateBoardSize();
    });
    
    document.getElementById('rows').addEventListener('input', () => scheduleBoardUpdate());
    document.getElementById('cols').addEventListener('input', () => scheduleBoardUpdate());
    document.getElementById('saveBoard').addEventListener('click', (e) => {
        e.preventDefault();
        saveBoard();
    });
    document.getElementById('saveTileText').addEventListener('click', (e) => {
        e.preventDefault();
        saveTileText();
    });
    document.getElementById('copyLink').addEventListener('click', (e) => {
        e.preventDefault();
        copyShareLink();
    });
    document.getElementById('closeEditor').addEventListener('click', () => {
        document.getElementById('tileEditor').style.display = 'none';
        removeEditingBorder();
        selectedTileIndex = null;
    });
    
    // Обработчик для чекбокса анимации в редакторе
    document.getElementById('specialAnimation').addEventListener('change', function(e) {
        if (this.checked && selectedTileIndex !== null) {
            const tile = document.querySelector(`[data-index="${selectedTileIndex}"]`);
            if (tile) {
                tile.classList.add('celebrate');
                setTimeout(() => {
                    tile.classList.remove('celebrate');
                }, 1000);
            }
        }
    });
}

function startRandomAnimation() {
    if (!isViewMode) return;
    
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    
    function scheduleNextAnimation() {
        const delay = Math.floor(Math.random() * 5000) + 10000;
        
        setTimeout(() => {
            if (!isViewMode) return;
            
            const unflippedTiles = currentBoard.tiles
                .map((tile, index) => ({ tile, index }))
                .filter(item => !item.tile.flipped);
            
            if (unflippedTiles.length > 0) {
                const randomIndex = Math.floor(Math.random() * unflippedTiles.length);
                const tileIndex = unflippedTiles[randomIndex].index;
                
                const tile = document.querySelector(`[data-index="${tileIndex}"]`);
                if (tile) {
                    tile.classList.add('random-shake');
                    setTimeout(() => {
                        tile.classList.remove('random-shake');
                    }, 1000);
                }
            }
            
            scheduleNextAnimation();
        }, delay);
    }
    
    scheduleNextAnimation();
}

function createConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    
    // Создаем 20 частиц конфетти
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Случайные размеры
        const size = Math.random() * 15 + 5;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        
        // Случайная задержка
        const delay = Math.random() * 2;
        confetti.style.animationDelay = `${delay}s`;
        
        // Случайное положение по горизонтали
        const left = Math.random() * 100;
        confetti.style.left = `${left}%`;
        
        // Случайная продолжительность анимации
        const duration = Math.random() * 2 + 2;
        confetti.style.animationDuration = `${duration}s`;
        
        container.appendChild(confetti);
    }
    
    document.body.appendChild(container);
    
    // Удаляем контейнер через 4 секунды
    setTimeout(() => {
        if (container.parentNode) {
            container.remove();
        }
    }, 4000);
}

// Создание конфетти вокруг конкретного элемента
function createConfettiAroundElement(element) {
    const rect = element.getBoundingClientRect();
    const container = document.createElement('div');
    container.className = 'confetti-container';
    container.style.position = 'fixed';
    container.style.top = `${rect.top - 100}px`;
    container.style.left = `${rect.left - 100}px`;
    container.style.width = `${rect.width + 200}px`;
    container.style.height = `${rect.height + 200}px`;
    container.style.pointerEvents = 'none';
    container.style.zIndex = '2001'; // Выше, чем попап
    
    // Создаем 30 частиц конфетти
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Случайные размеры
        const size = Math.random() * 15 + 5;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        
        // Случайная задержка
        const delay = Math.random() * 2;
        confetti.style.animationDelay = `${delay}s`;
        
        // Случайное положение в пределах контейнера
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        confetti.style.left = `${left}%`;
        confetti.style.top = `${top}%`;
        
        // Случайная продолжительность анимации
        const duration = Math.random() * 2 + 2;
        confetti.style.animationDuration = `${duration}s`;
        
        // Случайный цвет
        const hue = Math.random() * 360;
        confetti.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
        
        container.appendChild(confetti);
    }
    
    document.body.appendChild(container);
    
    // Удаляем контейнер через 4 секунды
    setTimeout(() => {
        if (container.parentNode) {
            container.remove();
        }
    }, 4000);
}

function showTilePopup(index) {
    const tile = currentBoard.tiles[index];
    if (!tile) return;
    
    if (!tile.flipped) {
        return;
    }
    
    if (!tile.text || tile.text === 'ничего') return;
    
    const existingPopup = document.querySelector('.tile-popup');
    if (existingPopup) {
        existingPopup.remove();
        if (popupTimeout) clearTimeout(popupTimeout);
    }
    
    // Создаем попап
    const popup = document.createElement('div');
    popup.className = 'tile-popup';
    popup.innerHTML = `
        <div class="popup-header">
            <span class="popup-number">№${index + 1}</span>
            <button class="popup-close">✕</button>
        </div>
        <div class="popup-divider"></div>
        <div class="popup-body">
            <span class="popup-text">${tile.text}</span>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Функция закрытия попапа
    function closePopup() {
        popup.classList.add('fade-out');
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
            // Убираем обработчики
            document.removeEventListener('click', handleOutsideClick);
        }, 500);
        if (popupTimeout) clearTimeout(popupTimeout);
    }
    
    // Обработчик клика вне попапа
    function handleOutsideClick(event) {
        // Проверяем, был ли клик вне попапа и не по крестику
        if (!popup.contains(event.target) && !event.target.classList.contains('popup-close')) {
            closePopup();
        }
    }
    
    // Добавляем обработчик клика по документу
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 100); // Небольшая задержка, чтобы не сработал сразу
    
    // Создаем конфетти вокруг попапа, только если у плитки включена праздничная анимация
    if (tile.animation) {
        createConfettiAroundElement(popup);
    }
    
    // Обработчик закрытия по крестику
    popup.querySelector('.popup-close').addEventListener('click', (e) => {
        e.stopPropagation(); // Предотвращаем всплытие
        closePopup();
    });
    
    // Автоматическое закрытие через 5 секунд
    popupTimeout = setTimeout(closePopup, 5000);
}

function scheduleBoardUpdate() {
    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => updateBoardSize(), 500);
}

function updateBoardSize() {
    const rows = Math.min(parseInt(document.getElementById('rows').value) || 1, 12);
    const cols = Math.min(parseInt(document.getElementById('cols').value) || 1, 12);
    const name = document.getElementById('boardName').value || 'Моя доска';
    
    document.getElementById('rows').value = rows;
    document.getElementById('cols').value = cols;
    
    createBoard(rows, cols, name);
}

function createBoard(rows, cols, name = 'Моя доска') {
    const oldTiles = currentBoard.tiles || [];
    const newTiles = [];
    
    for (let i = 0; i < rows * cols; i++) {
        if (i < oldTiles.length) {
            newTiles.push({
                title: oldTiles[i].title || '',
                text: oldTiles[i].text || '',
                color: oldTiles[i].color || defaultColor,
                animation: oldTiles[i].animation || false,
                flipped: false
            });
        } else {
            newTiles.push({
                title: '',
                text: '',
                color: defaultColor,
                animation: false,
                flipped: false
            });
        }
    }
    
    currentBoard = {
        id: null,
        name: name,
        rows: rows,
        cols: cols,
        tiles: newTiles
    };
    
    renderBoard();
    document.getElementById('shareSection').style.display = 'none';
    document.getElementById('tileEditor').style.display = 'none';
    removeEditingBorder();
    selectedTileIndex = null;
    
    setTimeout(() => {
        selectedTileIndex = 0;
        showTileEditor(0);
    }, 200);
}

function renderBoard() {
    const board = document.getElementById('board');
    const boardTitle = document.getElementById('boardTitle');
    const dimensions = document.getElementById('boardDimensions');
    
    if (isViewMode && currentBoard.name) {
        boardTitle.textContent = currentBoard.name;
        if (dimensions) dimensions.style.display = 'none';
    } else {
        boardTitle.textContent = 'Доска (превью)';
        if (dimensions) {
            dimensions.style.display = 'inline';
            dimensions.textContent = `(${currentBoard.rows}×${currentBoard.cols})`;
        }
    }
    
    board.style.setProperty('--rows', currentBoard.rows);
    board.style.setProperty('--cols', currentBoard.cols);
    
    board.innerHTML = '';
    
    currentBoard.tiles.forEach((tile, index) => {
        board.appendChild(createTileElement(index, tile));
    });
    
    setTimeout(adjustTileSizes, 50);
}

function createTileElement(index, tile) {
    const tileDiv = document.createElement('div');
    tileDiv.className = `tile ${tile.flipped ? 'flipped' : ''} ${isViewMode ? 'view-mode' : ''}`;
    tileDiv.dataset.index = index;
    tileDiv.style.backgroundColor = tile.color || defaultColor;
    
    const front = document.createElement('div');
    front.className = 'tile-front';
    
    if (tile.title) {
        const titleSpan = document.createElement('span');
        titleSpan.className = 'tile-title';
        titleSpan.textContent = tile.title;
        front.appendChild(titleSpan);
        
        const numberSpan = document.createElement('span');
        numberSpan.className = 'tile-number-corner';
        numberSpan.textContent = index + 1;
        front.appendChild(numberSpan);
    } else {
        const centerNumber = document.createElement('span');
        centerNumber.className = 'tile-number-center';
        centerNumber.textContent = index + 1;
        front.appendChild(centerNumber);
    }
    
    const back = document.createElement('div');
    back.className = 'tile-back';
    back.textContent = tile.text || 'ничего';
    
    tileDiv.appendChild(front);
    tileDiv.appendChild(back);
    
    tileDiv.addEventListener('click', () => handleTileClick(index));
    
    return tileDiv;
}

function handleTileClick(index) {
    if (isViewMode) {
        toggleTileFlip(index);
        // Показываем попап с текстом плитки
        showTilePopup(index);
    } else {
        if (selectedTileIndex !== null && selectedTileIndex !== index) {
            saveCurrentTileData();
        }
        selectedTileIndex = index;
        showTileEditor(index);
    }
}

function toggleTileFlip(index) {
    const wasFlipped = currentBoard.tiles[index].flipped;
    currentBoard.tiles[index].flipped = !wasFlipped;
    
    const tile = document.querySelector(`[data-index="${index}"]`);
    if (tile) {
        tile.classList.toggle('flipped');
        
        // Только покачивание для праздничной анимации при перевороте
        if (!wasFlipped && currentBoard.tiles[index].animation) {
            tile.classList.add('celebrate');
            setTimeout(() => {
                tile.classList.remove('celebrate');
            }, 1000);
        }
        
        // Показываем попап ТОЛЬКО при перевороте на обратную сторону
        if (!wasFlipped) {
            showTilePopup(index);
        }
    }
}

function showTileEditor(index) {
    const tile = currentBoard.tiles[index];
    
    document.getElementById('currentTileNum').textContent = `№${index + 1}`;
    document.getElementById('tileTitle').value = tile.title || '';
    document.getElementById('tileText').value = tile.text || '';
    document.getElementById('specialAnimation').checked = tile.animation || false;
    
    // Определяем цвет для этой плитки:
    // 1. Если у плитки есть свой цвет, используем его
    // 2. Если нет, используем lastUsedColor (цвет предыдущей плитки)
    let tileColor;
    
    if (tile.color && tile.color !== defaultColor) {
        tileColor = tile.color;
    } else {
        tileColor = lastUsedColor;
    }
    
    console.log('Showing tile', index, 'with color:', tileColor);
    
    // Выделяем соответствующий цвет в палитре
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.color === tileColor) {
            opt.classList.add('selected');
        }
    });
    
    removeEditingBorder();
    document.querySelector(`[data-index="${index}"]`).classList.add('editing');
    document.getElementById('tileEditor').style.display = 'block';
    
    setTimeout(() => {
        if (lastTileHadTitle) {
            document.getElementById('tileTitle').focus();
        } else {
            document.getElementById('tileText').focus();
        }
    }, 100);
}

function removeEditingBorder() {
    document.querySelectorAll('.tile.editing').forEach(t => t.classList.remove('editing'));
}

function saveCurrentTileData() {
    if (selectedTileIndex === null) return null;
    
    const title = document.getElementById('tileTitle').value;
    const text = document.getElementById('tileText').value;
    
    // Получаем выбранный цвет из палитры
    const selectedColorOption = document.querySelector('.color-option.selected');
    let color;
    
    if (selectedColorOption) {
        color = selectedColorOption.dataset.color;
    } else {
        // Если ничего не выбрано, используем последний цвет
        color = lastUsedColor;
    }
    
    const animation = document.getElementById('specialAnimation').checked;
    
    lastTileHadTitle = title.trim().length > 0;
    
    currentBoard.tiles[selectedTileIndex] = {
        ...currentBoard.tiles[selectedTileIndex],
        title: title,
        text: text,
        color: color,
        animation: animation
    };
    
    // Обновляем плитку в DOM
    const tile = document.querySelector(`[data-index="${selectedTileIndex}"]`);
    if (tile) {
        tile.style.backgroundColor = color;
        const front = tile.querySelector('.tile-front');
        front.innerHTML = '';
        
        if (title) {
            const titleSpan = document.createElement('span');
            titleSpan.className = 'tile-title';
            titleSpan.textContent = title;
            front.appendChild(titleSpan);
            
            const numberSpan = document.createElement('span');
            numberSpan.className = 'tile-number-corner';
            numberSpan.textContent = selectedTileIndex + 1;
            front.appendChild(numberSpan);
        } else {
            const centerNumber = document.createElement('span');
            centerNumber.className = 'tile-number-center';
            centerNumber.textContent = selectedTileIndex + 1;
            front.appendChild(centerNumber);
        }
        
        tile.querySelector('.tile-back').textContent = text || 'ничего';
    }
    
    // Возвращаем использованный цвет
    return color;
}

function saveTileText() {
    if (selectedTileIndex !== null) {
        // Сохраняем текущую плитку и получаем использованный цвет
        const usedColor = saveCurrentTileData();
        
        // Обновляем lastUsedColor цветом, который был использован
        if (usedColor) {
            lastUsedColor = usedColor;
        }
        
        let nextIndex = selectedTileIndex + 1;
        if (nextIndex >= currentBoard.tiles.length) {
            nextIndex = 0;
        }
        
        selectedTileIndex = nextIndex;
        showTileEditor(nextIndex);
    }
}

function saveBoard() {
    const boardId = generateBoardId();
    const boardName = document.getElementById('boardName').value || 'Моя доска';
    
    const boardData = {
        name: boardName,
        rows: currentBoard.rows,
        cols: currentBoard.cols,
        tiles: currentBoard.tiles.map(t => ({
            title: t.title,
            text: t.text,
            color: t.color,
            animation: t.animation
        })),
        createdAt: Date.now() // Добавляем timestamp для сортировки
    };
    
    boards[boardId] = boardData;
    localStorage.setItem('tileBoards', JSON.stringify(boards));
    
    currentBoard.id = boardId;
    currentBoard.name = boardName;
    
    document.getElementById('boardId').value = boardId;
    document.getElementById('shareSection').style.display = 'block';
    
    const fullUrl = `${window.location.origin}${window.location.pathname}?board=${boardId}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
        showSuccessPopup(`Доска "${boardName}" сохранена!\nСсылка скопирована в буфер обмена`);
    });
    
    updateBoardsList();
}

function generateBoardId() {
    return 'board_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function loadBoard(boardId, viewMode = false) {
    const board = boards[boardId];
    
    currentBoard = {
        id: boardId,
        name: board.name || 'Моя доска',
        rows: board.rows,
        cols: board.cols,
        tiles: board.tiles.map(t => ({
            title: t.title || '',
            text: t.text || '',
            color: t.color || defaultColor,
            animation: t.animation || false,
            flipped: false
        }))
    };
    
    isViewMode = viewMode;
    renderBoard();
    
    if (!viewMode) {
        document.getElementById('rows').value = board.rows;
        document.getElementById('cols').value = board.cols;
        document.getElementById('boardName').value = board.name || 'Моя доска';
        document.getElementById('boardId').value = boardId;
        document.getElementById('shareSection').style.display = 'block';
        
        setTimeout(() => {
            selectedTileIndex = 0;
            showTileEditor(0);
        }, 200);
    }
}

function updateBoardsList() {
    const privateList = document.getElementById('privateBoardsList');
    if (!privateList) return;
    
    privateList.innerHTML = '';
    
    // Сортируем доски по дате создания (от новых к старым)
    const privateEntries = Object.entries(boards)
        .sort((a, b) => {
            const dateA = a[1].createdAt || 0;
            const dateB = b[1].createdAt || 0;
            return dateB - dateA; // Сортировка по убыванию (новые сверху)
        });
    
    if (privateEntries.length) {
        privateEntries.forEach(([id, board]) => privateList.appendChild(createBoardListItem(id, board)));
    } else {
        privateList.innerHTML = '<div class="empty-message">Нет сохранённых досок</div>';
    }
}

function createBoardListItem(id, board) {
    const div = document.createElement('div');
    div.className = 'board-item';
    
    // Добавляем title к родительскому div, если название длиннее 15 символов
    const boardName = board.name || 'Без названия';
    if (boardName.length > 15) {
        div.title = boardName; // Тултип на родительском элементе
    }
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'board-name';
    nameSpan.textContent = boardName;
    
    const dimsSpan = document.createElement('span');
    dimsSpan.className = 'board-dimensions';
    dimsSpan.textContent = `${board.cols}×${board.rows}`;
    
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-board-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = 'Редактировать доску';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        handleEditBoard(id);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-board-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Удалить доску';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('Удалить эту доску?')) {
            delete boards[id];
            localStorage.setItem('tileBoards', JSON.stringify(boards));
            updateBoardsList();
            showSuccessPopup('Доска удалена');
        }
    };
    
    div.appendChild(nameSpan);
    div.appendChild(dimsSpan);
    div.appendChild(editBtn);
    div.appendChild(deleteBtn);
    
    div.addEventListener('click', () => {
        window.location.href = `${window.location.pathname}?board=${id}`;
    });
    
    return div;
}

function handleEditBoard(id) {
    if (hasUnsavedChanges()) {
        if (confirm('Есть несохраненные изменения. Загрузить выбранную доску? Все несохраненные изменения будут потеряны.')) {
            loadBoardForEditing(id);
        }
    } else {
        loadBoardForEditing(id);
    }
}

function loadBoardForEditing(id) {
    const board = boards[id];
    
    document.getElementById('boardName').value = board.name || 'Моя доска';
    document.getElementById('rows').value = board.rows;
    document.getElementById('cols').value = board.cols;
    
    currentBoard = {
        id: null,
        name: board.name || 'Моя доска',
        rows: board.rows,
        cols: board.cols,
        tiles: board.tiles.map(t => ({
            title: t.title || '',
            text: t.text || '',
            color: t.color || defaultColor,
            animation: t.animation || false,
            flipped: false
        }))
    };
    
    renderBoard();
    document.getElementById('shareSection').style.display = 'none';
    
    setTimeout(() => {
        selectedTileIndex = 0;
        showTileEditor(0);
    }, 200);
    
    showInfoPopup(`📝 Редактирование доски "${board.name}"`);
}

function hasUnsavedChanges() {
    return currentBoard.tiles.some(t => t.text || t.title);
}

function showSuccessPopup(message) {
    const popup = document.getElementById('successPopup');
    document.getElementById('popupMessage').textContent = message;
    popup.style.display = 'block';
    setTimeout(() => popup.style.display = 'none', 3000);
}

function showInfoPopup(message) {
    const popup = document.getElementById('successPopup');
    const icon = popup.querySelector('.popup-icon');
    const messageEl = document.getElementById('popupMessage');
    
    // Временно скрываем иконку
    if (icon) {
        icon.style.display = 'none';
    }
    
    messageEl.textContent = message;
    popup.style.display = 'block';
    
    setTimeout(() => {
        popup.style.display = 'none';
        // Возвращаем иконку
        if (icon) {
            icon.style.display = 'inline';
        }
    }, 2000);
}

function setupResizeObserver() {
    const wrapper = document.querySelector('.board-wrapper');
    if (!wrapper) return;
    
    if (resizeObserver) resizeObserver.disconnect();
    
    resizeObserver = new ResizeObserver(() => requestAnimationFrame(adjustTileSizes));
    resizeObserver.observe(wrapper);
}

function adjustTileSizes() {
    const wrapper = document.querySelector('.board-wrapper');
    const board = document.getElementById('board');
    const container = document.querySelector('.board-container');
    
    if (!wrapper || !board || !currentBoard || !container) return;
    
    if (isViewMode) {
        // В режиме просмотра используем размеры окна
        const windowWidth = window.innerWidth - 40;
        const windowHeight = window.innerHeight - 120;
        
        const gap = 10;
        const totalGapWidth = (currentBoard.cols - 1) * gap;
        const totalGapHeight = (currentBoard.rows - 1) * gap;
        
        const maxTileWidth = (windowWidth - totalGapWidth) / currentBoard.cols;
        const maxTileHeight = (windowHeight - totalGapHeight) / currentBoard.rows;
        
        let tileSize = Math.floor(Math.min(maxTileWidth, maxTileHeight));
        tileSize = Math.max(50, Math.min(150, tileSize));
        
        board.style.setProperty('--tile-size', `${tileSize}px`);
        board.style.setProperty('--gap-size', `${gap}px`);
        
        board.style.gridTemplateColumns = `repeat(${currentBoard.cols}, ${tileSize}px)`;
        board.style.gridTemplateRows = `repeat(${currentBoard.rows}, ${tileSize}px)`;
    } else {
        // В режиме превью
        const containerRect = container.getBoundingClientRect();
        
        // ТОЧНЫЙ расчет доступной ширины с учетом всех отступов
        // container имеет padding 15px слева и справа
        // board-wrapper не имеет padding
        // board имеет margin 15px слева и справа (в классе .board)
        const containerPadding = 30; // 15px слева + 15px справа
        const boardMargin = 30; // 15px слева + 15px справа (из класса .board)
        
        const availableWidth = containerRect.width - containerPadding - boardMargin - 5; // 5px запас
        const availableHeight = containerRect.height - 70; // Учитываем заголовок и отступы
        
        if (availableWidth < 50 || availableHeight < 50) {
            setTimeout(adjustTileSizes, 100);
            return;
        }
        
        const gap = 6; // Уменьшаем gap для экономии места
        const totalGapWidth = (currentBoard.cols - 1) * gap;
        const totalGapHeight = (currentBoard.rows - 1) * gap;
        
        // Вычисляем точный размер, который поместится
        let tileSizeByWidth = (availableWidth - totalGapWidth) / currentBoard.cols;
        let tileSizeByHeight = (availableHeight - totalGapHeight) / currentBoard.rows;
        
        // Выбираем минимальный размер, чтобы всё поместилось
        let tileSize = Math.floor(Math.min(tileSizeByWidth, tileSizeByHeight));
        
        // Ограничиваем максимальный размер в зависимости от количества столбцов
        // Но теперь используем точное вычисление, а не жесткие ограничения
        const absoluteMaxSize = 105; // Абсолютный максимум
        
        tileSize = Math.min(tileSize, absoluteMaxSize);
        tileSize = Math.max(40, tileSize); // Минимальный размер
        
        console.log(`Preview: cols=${currentBoard.cols}, availableWidth=${Math.floor(availableWidth)}, tileSize=${tileSize}`);
        
        board.style.setProperty('--tile-size', `${tileSize}px`);
        board.style.setProperty('--gap-size', `${gap}px`);
        
        board.style.gridTemplateColumns = `repeat(${currentBoard.cols}, ${tileSize}px)`;
        board.style.gridTemplateRows = `repeat(${currentBoard.rows}, ${tileSize}px)`;
    }
    
    setTimeout(() => {
        wrapper.scrollLeft = 0;
        wrapper.scrollTop = 0;
    }, 50);
}

function copyShareLink() {
    const boardId = document.getElementById('boardId').value;
    if (!boardId) return;
    
    const fullUrl = `${window.location.origin}${window.location.pathname}?board=${boardId}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
        showSuccessPopup('Полная ссылка скопирована в буфер обмена');
    });
}