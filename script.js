document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('grid');
    const gameArea = document.getElementById('gameArea');
    const cardsContainer = document.getElementById('cardsContainer');
    const timerElement = document.getElementById('timer');
    const logoInput = document.getElementById('logoInput');
    
    // Firebase 초기화
    const database = firebase.database();

    // Firebase 연결 상태 확인
    firebase.database().ref('.info/connected').on('value', function(snap) {
        if (snap.val() === true) {
            console.log('Firebase에 연결되었습니다.');
        } else {
            console.log('Firebase 연결이 끊어졌습니다.');
        }
    });

    const state = {
        firstCard: null,
        secondCard: null,
        matchCount: 0,
        timerId: null,
        currentCell: null,
        canClick: true
    };

    createGrid(grid);
    initializeLogoListener();

    function createGrid(grid) {
        for (let i = 0; i < 1000; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-item';
            cell.dataset.index = i;
            cell.addEventListener('click', () => {
                startMemoryGame(cell);
            });
            grid.appendChild(cell);
        }
    }

    function initializeLogoListener() {
        database.ref('logos').on('value', (snapshot) => {
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const index = childSnapshot.key;
                    const logoData = childSnapshot.val();
                    updateGridCell(index, logoData);
                });
            } else {
                console.log('저장된 로고가 없습니다.');
            }
        }, (error) => {
            console.error('로고 데이터 읽기 오류:', error);
        });
    }

    function updateGridCell(index, logoData) {
        const cell = document.querySelector(`.grid-item[data-index="${index}"]`);
        if (cell && logoData) {
            const img = new Image();
            img.src = logoData;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            cell.innerHTML = '';
            cell.appendChild(img);
        }
    }

    function startMemoryGame(cell) {
        resetGame();
        state.currentCell = cell;
        gameArea.style.display = 'flex';
        setupCards();
        setupTimer(10);
    }

    function resetGame() {
        cardsContainer.innerHTML = '';
        state.firstCard = null;
        state.secondCard = null;
        state.matchCount = 0;
        state.canClick = true;
        clearInterval(state.timerId);
    }

    function setupCards() {
        let cards = ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D'];
        shuffle(cards);
        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.cardValue = card;
            cardElement.addEventListener('click', function() {
                cardClickHandler(this);
            });
            cardsContainer.appendChild(cardElement);
        });
    }

    function cardClickHandler(card) {
        if (!state.canClick || card.classList.contains('revealed') || card === state.firstCard || card === state.secondCard) {
            return;
        }

        revealCard(card);

        if (!state.firstCard) {
            state.firstCard = card;
        } else if (!state.secondCard) {
            state.canClick = false;
            state.secondCard = card;

            if (state.firstCard.dataset.cardValue === state.secondCard.dataset.cardValue) {
                state.matchCount++;
                state.firstCard.classList.add('revealed');
                state.secondCard.classList.add('revealed');
                state.firstCard = null;
                state.secondCard = null;
                state.canClick = true;
                if (state.matchCount === 4) {
                    endGame(true);
                }
            } else {
                setTimeout(() => {
                    hideCards(state.firstCard, state.secondCard);
                    state.firstCard = null;
                    state.secondCard = null;
                    state.canClick = true;
                }, 500);
            }
        }
    }

    function setupTimer(seconds) {
        updateTimerDisplay(seconds);
        state.timerId = setInterval(() => {
            seconds--;
            updateTimerDisplay(seconds);
            if (seconds <= 0) {
                clearInterval(state.timerId);
                endGame(false);
            }
        }, 1000);
    }

    function updateTimerDisplay(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        timerElement.textContent = `${min}:${sec < 10 ? '0' + sec : sec}`;
    }

    function revealCard(card) {
        card.textContent = card.dataset.cardValue;
        card.style.fontSize = '16px';
    }

    function hideCards(firstCard, secondCard) {
        firstCard.style.fontSize = '0px';
        firstCard.textContent = '';
        secondCard.style.fontSize = '0px';
        secondCard.textContent = '';
    }

    function endGame(success) {
        clearInterval(state.timerId);
        gameArea.style.display = 'none';
        if (success) {
            setTimeout(() => {
                alert("게임 성공! 로고를 업로드하세요.");
                openLogoUploader(state.currentCell).then(() => {
                    console.log('Logo uploaded successfully');
                    state.currentCell = null;
                }).catch(error => {
                    console.error('Error uploading logo:', error);
                });
            }, 100);
        } else {
            alert("시간 초과! 게임 실패.");
        }
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function saveLogo(cell, logoData) {
        return database.ref('logos/' + cell.dataset.index).set(logoData)
        .then(() => {
            console.log('로고가 성공적으로 저장되었습니다.');
        })
        .catch((error) => {
            console.error('로고 저장 실패:', error);
            throw error;
        });
    }

    function openLogoUploader(cell) {
        return new Promise((resolve, reject) => {
            logoInput.value = '';
            logoInput.onchange = function(event) {
                const file = event.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        saveLogo(cell, e.target.result).then(() => {
                            resolve();
                        }).catch((error) => {
                            reject(new Error('Failed to save logo'));
                        });
                    };
                    img.onerror = function() {
                        reject(new Error('Failed to load image'));
                    };
                    img.src = e.target.result;
                };
                reader.onerror = function() {
                    reject(new Error('Failed to read file'));
                };
                reader.readAsDataURL(file);
            };
            logoInput.click();
        });
    }
});