const { ipcRenderer } = require('electron');
const path = require('path');

currentType = 'PRODUCTIVE_TIME',
lastType = null;
shortPauseTime = 5,
longPauseTime = 15,
productiveTime = 25,
clock = document.getElementById('clock'),
startOrResumeButton = document.getElementById('startOrResume'),
pauseButton = document.getElementById('pause'),
stopButton = document.getElementById('stop'),
currentTime = '0:00',
state = '',
timeLeft = 0,
timePassed = 0,
currentTimeLimit = 0,
FULL_DASH_ARRAY = 283,
version= document.getElementById('version'),
historyName = 'HS_CLOCK',
taskName = 'TASK_DATA',
historyData = localStorage.getItem(historyName) != null ? JSON.parse(localStorage.getItem(historyName)) : [],
tasksData = localStorage.getItem(taskName) != null ? JSON.parse(localStorage.getItem(taskName)) : [],
currentTitle = document.title,
countDownTime = null,
notification = false,
historyDiv = document.getElementById('history'),
playing = false,
timing = null;

checkData();
updateType();
renderTypes();
renderData();
renderTasks();

 function addTask(data = {
     text: '',
     check: false,
     created_at: new Date().toISOString()
 }) {
    tasksData = getTasks();
    tasksData.push(data);
    localStorage.setItem(taskName,JSON.stringify(tasksData));
 }

 function checkTask(index) {
    tasksData = getTasks();
    tasksData[index].checked = !tasksData[index].checked;
    localStorage.setItem(taskName,JSON.stringify(tasksData));
    renderTasks();
 }

 function sendTask(){
     let text = document.getElementById('text').value;
     if(text){
        document.getElementById('text').value = '';
        addTask({
            text,
            check: false,
            created_at: new Date().toDateString()
        });
        renderTasks();
     }
 }

 function removeTask(index) {
    tasksData = getTasks();
    tasksData.splice(index, 1);
    localStorage.setItem(taskName,JSON.stringify(tasksData));
    renderTasks();
 }

 function getTasks() {
    return localStorage.getItem(taskName) != null ? JSON.parse(localStorage.getItem(taskName)) : [];
 }

 function renderTasks(){
    tasksData = getTasks();
    let html = ``;
    for (const [i, v] of tasksData.entries()) {
        let time = new Date(v.created_at)
        html += `\n
        <div class="task ${v.checked == true ? 'checked' : ''}" onclick="checkTask(${i})">
            <span class="time">${time.getDate()}/${time.getMonth()+1}/${time.getFullYear()} ${time.getHours()}:${time.getMinutes()}</span>
            <span class="task-text">${v.text}</span>
            <buttton class="btn-remove-task" type="button" onclick="removeTask(${i})"></buttton>
        </div>
        `
    }
    document.getElementById('tasks').innerHTML = html;
 }

 function getHistory() {
   return localStorage.getItem(historyName) != null ? JSON.parse(localStorage.getItem(historyName)) : [];
 }

 function checkData() {
    historyData =  getHistory();
    if(historyData.length > 0){
        let time = new Date(historyData[historyData.length-1].time_start);
        let dateNow = new Date();
        if(time.getDate() != dateNow.getDate() && time.getMonth() != dateNow.getMonth() && time.getFullYear() != dateNow.getFullYear()){
            localStorage.removeItem(historyName);
            return;
        } else return;
    }
    return;
 }

function renderData() {
    historyData =  getHistory();
    let html = ``;
    for (const data of historyData) {
        let timeStart = new Date(data.time_start);
        let timeEnd = new Date(data.time_end);
        html += `\n
        <div class="history-item">
            <span class="time">${timeStart.getDate()+'/'+(timeStart.getMonth()+1)+'/'+timeStart.getFullYear()} - ${timeStart.getHours()}:${timeStart.getMinutes()} ?? ${timeEnd.getHours()}:${timeEnd.getMinutes()}</span>
            <span class="type">${data.type}</span>
        </div>
        `;
    }
    historyDiv.innerHTML = html;
}

function setHistoryData(data){
    historyData =  getHistory();
    historyData.push(data);
    localStorage.setItem(historyName, JSON.stringify(historyData))
}

function deleteHistoryData(index){
    historyData =  getHistory();
    delete historyData[i];
    localStorage.setItem(historyName, JSON.stringify(historyData))
}

 function showNotification(title, body){
    return ipcRenderer.invoke('notification', { title, body })
 }

function renderTypes() {
    let types = document.getElementById('types');
    for (let i = 0; i < types.children.length; i++) {
        let children = types.children.item(i);
        children.style.display = "none";
    }
    switch(currentType) {
        case 'PRODUCTIVE_TIME':
            document.getElementById('PRODUCTIVE_TIME').style.display = 'block';
            break;
        case 'SHORT_PAUSE_TIME':
            document.getElementById('SHORT_PAUSE_TIME').style.display = 'block';
            break;
        case 'LONG_PAUSE_TIME':
            document.getElementById('LONG_PAUSE_TIME').style.display = 'block';
            break;
    }
}

function startOrResume(auto = false){
    switch (state){
        case '':
            start(auto);
            break;
        case 'FINISHED':
            start(auto);
            break;
        case 'PAUSED':
            resume();
            break;
    }
}

function start(auto = false) {
    countDownTime = new Date();

    switch (currentType){
        case 'PRODUCTIVE_TIME':
            let begin = () => {
                currentTimeLimit = productiveTime * 60;
                startClock();
                timePassed = 0;
                lastType = currentType;
                state = 'TIMING';
            }
            if(auto && autoPromo){
                begin();
                showNotification(`Seu tempo de foco come??ou, voc?? tem ${productiveTime}min.`)
            } else if(!auto){
                begin()
            }
            break;
        case 'SHORT_PAUSE_TIME':
            let beginPause = () => {
                currentTimeLimit = shortPauseTime * 60;
                startClock();
                timePassed = 0;
                lastType = currentType;
                state = 'TIMING';
            }
            if(auto && autoBreak){
                beginPause();
                showNotification(`Seu tempo de pausa come??ou, voc?? tem ${shortPauseTime}min.`)
            } else if(!auto){
                beginPause();
            }
            break;
        case 'LONG_PAUSE_TIME':
            currentTimeLimit = longPauseTime * 60;
            startClock();
            timePassed = 0;
            lastType = currentType;
            state = 'TIMING';
            if(auto){
                showNotification(`Sua pausa longa come??ou, voc?? tem ${longPauseTime}min.`)
            }
            break;
    }
    ipcRenderer.invoke('stateChange', state);
    startOrResumeButton.style.display = 'none';
    pauseButton.style.display = 'block';
    stopButton.style.display = 'block';

}

function resume() {
    startOrResumeButton.style.display = 'none';
    startOrResumeButton.innerText = 'Iniciar';
    pauseButton.style.display = 'block';
    state = 'TIMING';
    ipcRenderer.invoke('stateChange', state);
    startClock();
}

function pause() {
    clearInterval(timing);
    updateClockToTime();
    startOrResumeButton.innerText = 'Resumir';
    startOrResumeButton.style.display = 'block';
    pauseButton.style.display = 'none';
    state = 'PAUSED';
    ipcRenderer.invoke('stateChange', state);
    document.title = `PAUSADO | ${currentTitle}`;
}

function startClock() {
    timing = setInterval(() => {
        updateClockToTime();
    }, 1000);
}

function eventFinish() {
    setHistoryData({
        type: currentType,
        time_start: countDownTime,
        time_end: new Date()
    });
    renderData();
    startOrResumeButton.style.display = 'block';
    pauseButton.style.display = 'none';
    stopButton.style.display = 'none';
    document.title = currentTitle;
    state = 'FINISHED';
    ipcRenderer.invoke('stateChange', state);
    if(autoBreak || autoPomo){
        updateType(true, true);
        startOrResume(true);
    } else {
        updateType(true);
    }
}

function updateType(notification = false) {
    
    lastType = historyData[historyData.length-1]?.type;
    if(lastType){
        currentType = getNextType();
    } else {
        currentType = 'PRODUCTIVE_TIME';
    }
    if(notification && !auto){
        switch(currentType){
            case 'PRODUCTIVE_TIME':
                showNotification(`Tempo de pausa acabou, hora de focar por ${productiveTime}min.`);
                break;
            case 'LONG_PAUSE_TIME':
                showNotification(`Tempo de focar acabou, hora de uma pausa longa de ${longPauseTime}min.`);
                break;
            case 'SHORT_PAUSE_TIME':
                showNotification(`Tempo de focar acabou, hora de pausar por ${shortPauseTime}min.`);
                break;
        }
    }
    renderTypes();
}

function getNextType() {
    if(lastType == 'PRODUCTIVE_TIME'){
        historyData = getHistory();
        let data = [];
        if(historyData.length >= 7){
            let total = historyData.length > 7 ? historyData.length-7 : 0;
            for (let i = total; i < total+7; i++) {
                data.push(historyData[i]);
            }
            if(data.filter(x => x.type == 'SHORT_PAUSE_TIME').length >= 3){
                return 'LONG_PAUSE_TIME';  
            } else {
                return 'SHORT_PAUSE_TIME';
            }
        } else {
            return 'SHORT_PAUSE_TIME';
        }
    } else if(lastType == 'SHORT_PAUSE_TIME' || lastType == 'LONG_PAUSE_TIME') {
        if(lastType == 'LONG_PAUSE_TIME') {
            shortPauses = 0;
        }
       return 'PRODUCTIVE_TIME';
    }
}

function stopAll() {
    clearInterval(timing);
    clock.innerHTML = currentTime;
    startOrResumeButton.innerText = 'Iniciar';
    startOrResumeButton.style.display = 'block';
    pauseButton.style.display = 'none';
    stopButton.style.display = 'none';
    state = 'FINISHED';
    renderTypes();
    currentTimeLimit = 0;
    timePassed = 0;
    timeLeft = 0;
    document.title = currentTitle;
    ipcRenderer.invoke('stateChange', state);
}

async function updateClockToTime(){
    timePassed = timePassed += 1;
    timeLeft = currentTimeLimit - timePassed;
    
    setCircleDasharray();

    // let minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    // let seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;

    if(minutes == 5 && seconds == 0){
        showNotification('Restam 5min para concluir o rel??gio.');
    }

    if(minutes <= 0 && seconds <= 3) {
        if(!playing){
            playing = true;
            let audio = new Audio('./assets/audio/mixkit-simple-countdown-922.wav');
            await audio.play();
        }
    }

    if (seconds < 10) {
        seconds = `0${seconds}`;
    }
  
    currentTime = `${minutes}:${seconds}`;
    clock.innerHTML = currentTime;

   
    document.title = `${currentTime} | ${currentTitle}`;

    if (timeLeft < 0) {
        clearInterval(timing);
        currentTime = '0:00';
        clock.innerHTML = currentTime;
        playing = false;
        eventFinish();
    }
}




// When document has loaded, initialise
document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls();

        ipcRenderer.on('start', e => {
            startOrResume();
        });

        ipcRenderer.on('stop', e => {
            stopAll();
        })
        
        ipcRenderer.on('pause', e => {
            pause();
        })


        ipcRenderer.on('update-available', () => {
            document.getElementById('update').style.display = 'block';
            document.getElementById('searchUpdate').style.display = 'none';
            document.getElementById('newUpdate').style.display = 'block';
        })

        ipcRenderer.on('update-not-available', () => {
            document.getElementById('update').style.display = 'none';
            document.getElementById('searchUpdate').style.display = 'none';
            document.getElementById('newUpdate').style.display = 'none';
        })
        
    
        ipcRenderer.on('update-downloaded', () => {
            document.getElementById('update').style.display = 'block';
            document.getElementById('searchUpdate').style.display = 'none';
            document.getElementById('newUpdate').style.display = 'none';
            document.getElementById('newUpdate2').style.display = 'block';
            document.getElementById('progressBar').style.display = 'none'
        })

        ipcRenderer.on('error', () => {
            document.getElementById('update').style.display = 'block';
            document.getElementById('searchUpdate').style.display = 'none';
            document.getElementById('newUpdate').style.display = 'none';
            document.getElementById('newUpdate2').style.display = 'none';
            document.getElementById('errorUpdate').style.display = 'none'
        })
        
  
    }
};

function quitAndInstall() {
    ipcRenderer.invoke('quitAndInstall');
} 

window.onbeforeunload = (event) => {
    /* If window is reloaded, remove win event listeners
    (DOM element listeners get auto garbage collected but not
    Electron win listeners as the win is not dereferenced unless closed) */
    ipcRenderer.removeAllListeners();
}

function handleWindowControls() {
    // Make minimise/maximise/restore/close buttons work when they are clicked
    document.getElementById('min-button').addEventListener("click", event => {
        // ipcRenderer.minimize();
        ipcRenderer.invoke('minimize');
    });

    document.getElementById('max-button').addEventListener("click", event => {
       
        ipcRenderer.invoke('maxOrUnmax');
    });

    document.getElementById('restore-button').addEventListener("click", event => {
     
        ipcRenderer.invoke('maxOrUnmax');
        
    });

    ipcRenderer.on('version', (event, text) => {
        version.innerText = text
     })

    document.getElementById('close-button').addEventListener("click", event => {
        // win.close();
        ipcRenderer.invoke('close');
    });

    // Toggle maximise/restore buttons when maximisation/unmaximisation occurs
    // toggleMaxRestoreButtons();
    ipcRenderer.on('minOrmax', toggleMaxRestoreButtons);

    function toggleMaxRestoreButtons(e, data) {
        if (data == 'maximize') {
            document.body.classList.add('maximized');
        } else {
            document.body.classList.remove('maximized');
        }
    }
}




// Credit: Mateusz Rybczonec






function calculateTimeFraction() {
  const rawTimeFraction = timeLeft / currentTimeLimit;
  return rawTimeFraction - (1 / currentTimeLimit) * (1 - rawTimeFraction);
}

function setCircleDasharray() {
  const circleDasharray = `${(
    calculateTimeFraction() * FULL_DASH_ARRAY
  ).toFixed(0)} 283`;
  document
    .getElementById("base-timer-path-remaining")
    .setAttribute("stroke-dasharray", circleDasharray);
}