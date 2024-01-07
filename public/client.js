import "./assets/xterm/xterm.js";
import "./assets/xterm/xterm-addon-fit.js";

const config = {
  cursorBlink: true,
  cursorStyle: "block",
  cursorInactiveStyle: "none",
  ignoreBracketedPasteMode: true,
  scrollback: 1000,
  tabStopWidth: 4,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 16,
  theme: {
    background: "#111",
    cursor: "#59b180",
    selection: "#357fd3",
    green: "#3ebc59",
    brightGreen: "#2fd455",
    yellow: "#e3b449",
    brightYellow: "#e4e236",
    red: "#ca3459",
    brightRed: "#ef3352",
  },
};

class Client {
  constructor() {
    this.socketProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    this.host = window.location.hostname;
    this.port = window.location.port ;
    const urlSearchParams = new URLSearchParams(window.location.search);
    this.token = urlSearchParams.get('token') ? urlSearchParams.get('token') : this.getCookie('token');
    !this.token ? this.redirectToLogin() : null;
    if(urlSearchParams.get('token')){
      this.setCookie('token', this.token, 1);
      this.reload();
    }
    const socketUrl = `${this.socketProtocol}://${this.port !== '' ? this.host + ':' + this.port : this.host}/terminal?token=${this.token}`;
    // console.log(socketUrl);
    this.socket = new WebSocket(socketUrl);
    this.elParent = document.getElementById("terminal");
  }

  async timeOut(timeInMs) {
    await new Promise((resolve) => setTimeout(resolve, timeInMs));
  }

  setCookie(name, value, days) {
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
  }

  getCookie(name) {
    const pattern = new RegExp(`(?:(?:^|.*;\\s*)${name}\\s*\\=\\s*([^;]*).*$)|^.*$`);
    const match = document.cookie.match(pattern);
    return match ? decodeURIComponent(match[1]) : null;
  }

  redirectToLogin(){
    window.location.href = `https://account.setscharts.app?ref=${window.location.protocol}//${this.port !== '' ? this.host + ':' + this.port : this.host}/terminal`
  }

  reload(){
    window.location.href = `${window.location.protocol}//${this.port !== '' ? this.host + ':' + this.port : this.host}/terminal`
  }

  createTerminal = () => {
    const term = new window.Terminal(config);
    const fitAddon = new window.FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    fitAddon.fit();
    term.open(this.elParent);

    term.onData((data) => {
      this.socket.send(data);
    });

    this.socket.onopen = async () => {
      term.write("Initializing Sets Terminal.");
      let i = 1;
      while (i <= 3) {
        await this.timeOut(1000);
        term.write(".");
        i++;
      }
      term.write("\x1Bc");
      term.focus();
      if(this.socket.readyState === 1){
        this.socket.send("clear");
        this.socket.send("\n");
      }

      this.socket.onmessage = (event) => {
        event.data === 'ping' ? this.socket.send('pong') : term.write(event.data);
      };
    }

    this.socket.onclose = () => {
      term.dispose();
      this.redirectToLogin();
    };
  };
}

const client = new Client();
client.createTerminal();
