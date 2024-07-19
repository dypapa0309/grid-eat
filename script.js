document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('grid');
    const gameArea = document.getElementById('gameArea');
    const cardsContainer = document.getElementById('cardsContainer');
    const timerElement = document.getElementById('timer');
    const logoInput = document.getElementById('logoInput');
    
    // Firebase 초기화
    const database = firebase.database();

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
    adjustGridLayout(); // 초기 레이아웃 조정

    function createGrid(grid) {
        const totalCells = 1000; // 40x25 그리드 유지
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-item';
            cell.dataset.index = i;
            cell.addEventListener('click', () => {
                startMemoryGame(cell);
            });
            grid.appendChild(cell);
        }
    }

    function adjustGridLayout() {
        const gridContainer = document.getElementById('gridContainer');
        const grid = document.getElementById('grid');
        const windowWidth = window.innerWidth;
        if (windowWidth <= 768) { // 모바일 화면
            grid.style.gridTemplateColumns = 'repeat(20, 1fr)';
            gridContainer.style.overflowX = 'auto';
        } else { // 데스크톱 화면
            grid.style.gridTemplateColumns = 'repeat(40, 1fr)';
            gridContainer.style.overflowX = 'hidden';
        }
    }

    window.addEventListener('load', adjustGridLayout);
    window.addEventListener('resize', adjustGridLayout);

    function initializeLogoListener() {
        const logosRef = database.ref('logos');
        logosRef.on('value', (snapshot) => {
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
            cell.innerHTML = ''; // 기존 내용 제거
            const img = new Image();
            img.src = logoData;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            cell.appendChild(img);
            
            let touchStartTime;
            cell.addEventListener('touchstart', (e) => {
                touchStartTime = new Date().getTime();
            });
            
            cell.addEventListener('touchend', (e) => {
                const touchEndTime = new Date().getTime();
                const touchDuration = touchEndTime - touchStartTime;
                
                if (touchDuration > 500) { // 0.5초 이상 터치했을 때
                    e.preventDefault();
                    showExpandedImage(logoData);
                }
            });
            
            console.log(`Grid cell ${index} updated with new logo`);
        } else {
            console.log(`Failed to update grid cell ${index}. Cell: ${cell}, Logo data: ${logoData ? 'exists' : 'missing'}`);
        }
    }

    function showExpandedImage(logoData) {
        const overlay = document.createElement('div');
        overlay.className = 'expanded-overlay';
        
        const img = new Image();
        img.src = logoData;
        img.className = 'expanded-image';
        
        overlay.appendChild(img);
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
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
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = 60;  // 크기를 60x60으로 증가
                        canvas.height = 60;
                        ctx.drawImage(img, 0, 0, 60, 60);
                        const resizedImageData = canvas.toDataURL('image/png', 1.0);  // PNG 형식 사용, 최대 품질
                        
                        updateGridCell(cell.dataset.index, resizedImageData); // 즉시 그리드 셀 업데이트
                        
                        saveLogo(cell, resizedImageData).then(() => {
                            console.log('Logo saved to Firebase');
                            resolve();
                        }).catch((error) => {
                            console.error('Failed to save logo to Firebase:', error);
                            reject(new Error('Failed to save logo'));
                        });
                    };
                    img.onerror = function() {
                        console.error('Failed to load image');
                        reject(new Error('Failed to load image'));
                    };
                    img.src = e.target.result;
                };
                reader.onerror = function() {
                    console.error('Failed to read file');
                    reject(new Error('Failed to read file'));
                };
                reader.readAsDataURL(file);
            };
            logoInput.click();
        });
    }
});