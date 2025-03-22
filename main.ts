import { Plugin, Notice, Modal } from 'obsidian';

export default class StatusBarTimerPlugin extends Plugin {
  statusBarText: HTMLElement;
  pomodoroCounterText: HTMLElement;
  startButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  zenButton: HTMLButtonElement;
  timerInterval: number;
  startTime: number;
  isRunning: boolean;
  pomodoroInterval: number;
  pomodoroTime: number;
  isZenMode: boolean;
  leftSplitCollapsed: boolean;
  rightSplitCollapsed: boolean;
  pomodoroCount: number;
  ribbonIcon: HTMLElement; // Store the ribbon icon element

  async onload() {
    console.log('Status Bar Timer Plugin loaded!');

    // Initialize Pomodoro counter
    this.pomodoroCount = 0;

    // Create a container for the status bar elements
    const statusBarContainer = this.addStatusBarItem();
    statusBarContainer.createEl('span', { text: 'Timer: ' });

    // Add the timer display
    this.statusBarText = statusBarContainer.createEl('span', { text: '00:00:00' });

    // Add the Pomodoro counter display (tomato emoji)
    this.pomodoroCounterText = statusBarContainer.createEl('span', { text: ' 🍅 0' });

    // Add a Start button
    this.startButton = statusBarContainer.createEl('button', { text: 'Start' }) as HTMLButtonElement;
    this.startButton.addEventListener('click', () => this.startTimer());

    // Add a Stop button
    this.stopButton = statusBarContainer.createEl('button', { text: 'Stop' }) as HTMLButtonElement;
    this.stopButton.addEventListener('click', () => this.stopTimer());
    this.stopButton.disabled = true; // Disable Stop button initially

    // Add a Zen button
    this.zenButton = statusBarContainer.createEl('button', { text: 'Zen' }) as HTMLButtonElement;
    this.zenButton.addEventListener('click', () => this.toggleZenMode());

    // Add a Pomodoro button to the sidebar (ribbon icon)
    this.ribbonIcon = this.addRibbonIcon('timer', 'Start Pomodoro', () => this.openPomodoroModal());
    // Initialize states
    this.isRunning = false;
    this.pomodoroTime = 0;
    this.isZenMode = false;
  }

  startTimer() {
    if (this.isRunning) return; // Timer is already running

    this.startTime = Date.now();
    this.timerInterval = window.setInterval(() => this.updateTimer(), 1000);
    this.isRunning = true;

    // Update button states
    this.startButton.disabled = true;
    this.stopButton.disabled = false;
  }

  stopTimer() {
    if (!this.isRunning) return; // Timer is not running

    window.clearInterval(this.timerInterval);
    this.isRunning = false;

    // Update button states
    this.startButton.disabled = false;
    this.stopButton.disabled = true;
  }

  updateTimer() {
    const elapsedTime = Date.now() - this.startTime;
    const formattedTime = this.formatTime(elapsedTime);
    this.statusBarText.setText(formattedTime);
  }

  formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  toggleZenMode() {
    this.isZenMode = !this.isZenMode;

    if (this.isZenMode) {
      // Enter Zen mode: Collapse sidebars
      this.storeSplitsValues();
      this.collapseSplits();
      this.zenButton.setText('Normal');
    } else {
      // Exit Zen mode: Restore sidebars
      this.restoreSplits();
      this.zenButton.setText('Zen');
    }
  }

  storeSplitsValues() {
    // @ts-ignore
    this.leftSplitCollapsed = this.app.workspace.leftSplit.collapsed;
    // @ts-ignore
    this.rightSplitCollapsed = this.app.workspace.rightSplit.collapsed;
  }

  collapseSplits() {
    // @ts-ignore
    this.app.workspace.leftSplit.collapse();
    // @ts-ignore
    this.app.workspace.rightSplit.collapse();
  }

  restoreSplits() {
    if (!this.leftSplitCollapsed) {
      // @ts-ignore
      this.app.workspace.leftSplit.expand();
    }

    if (!this.rightSplitCollapsed) {
      // @ts-ignore
      this.app.workspace.rightSplit.expand();
    }
  }

  openPomodoroModal() {
    // Create a modal for Pomodoro settings
    const modal = new PomodoroModal(this.app, (time: number) => this.startPomodoro(time));
    modal.open();
  }

  startPomodoro(time: number) {
    this.pomodoroTime = time * 60 * 1000; // Convert minutes to milliseconds
    const endTime = Date.now() + this.pomodoroTime;

    // Update the timer display every second
    this.pomodoroInterval = window.setInterval(() => {
      const remainingTime = endTime - Date.now();
      if (remainingTime <= 0) {
        this.stopPomodoro();
        this.incrementPomodoroCounter();
		new Notice('Интервал закончился. Можно выйти покурить');
		window.clearInterval(this.pomodoroInterval); // Clear the interval
      } else {
        this.statusBarText.setText(this.formatTime(remainingTime));
      }
    }, 1000);
  }

  stopPomodoro() {
    window.clearInterval(this.pomodoroInterval);
    this.statusBarText.setText('00:00:00');
  }

  incrementPomodoroCounter() {
    this.pomodoroCount++;
    this.pomodoroCounterText.setText(` 🍅 ${this.pomodoroCount}`);
  }

  onunload() {
    console.log('Status Bar Timer Plugin unloaded!');
    // Clear the interval when the plugin is unloaded
    window.clearInterval(this.timerInterval);
    window.clearInterval(this.pomodoroInterval);

    // Ensure sidebars are restored when the plugin is unloaded
    if (this.isZenMode) {
      this.restoreSplits();
    }

    // Remove the ribbon icon when the plugin is unloaded
    if (this.ribbonIcon) {
      this.ribbonIcon.remove();
    }
  }
}

class PomodoroModal extends Modal {
  onSubmit: (time: number) => void;

  constructor(app: import('obsidian').App, onSubmit: (time: number) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Pomodoro Timer' });

    // Add a dropdown for selecting the countdown time
    const timeSelect = contentEl.createEl('select');
	timeSelect.createEl('option', { value: '5', text: '5 минут' });
	timeSelect.createEl('option', { value: '10', text: '10 минут' });
	timeSelect.createEl('option', { value: '25', text: '25 минут' });
	timeSelect.createEl('option', { value: '45', text: '45 минут' });
	timeSelect.createEl('option', { value: '0.8', text: 'Тест для показа уведомления'});

    // Add a start button
    const startButton = contentEl.createEl('button', { text: 'Start' });
    startButton.addEventListener('click', () => {
      const selectedTime = parseInt(timeSelect.value);
      this.onSubmit(selectedTime);
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}