import PasswordCracker from '../components/Minigames/PasswordCracker';
import NetworkScanner from '../components/Minigames/NetworkScanner';
import FileDecryptor from '../components/Minigames/FileDecryptor';
import SshLogin from '../components/Minigames/SshLogin';
import FirewallBreach from '../components/Minigames/FirewallBreach';
import PhishingSimulator from '../components/Minigames/PhishingSimulator';
import CryptographyChallenge from '../components/Minigames/CryptographyChallenge';
import MalwareAnalyzer from '../components/Minigames/MalwareAnalyzer';
import SocialEngineering from '../components/Minigames/SocialEngineering';
import DigitalForensics from '../components/Minigames/DigitalForensics';

export const commands = {
  help: () => `Available commands:\n` +
             `scan - Network scanning tool\n` +
             `devices - List scanned devices\n` +
             `crack - Password cracking module\n` +
             `ssh <ip> - Access device via SSH\n` +
             `decrypt - File decryption utility\n` +
             `firewall <ip> - Breach firewall protection\n` +
             `phish <target> - Phishing simulation\n` +
             `crypto <msg> - Cryptography challenge\n` +
             `malware <sample> - Analyze malware\n` +
             `social <target> - Social engineering attack\n` +
             `forensic <artifact> - Digital forensics\n` +
             `clear - Reset terminal\n` +
             `help - Show this help`,
  
  scan: {
    gameComponent: NetworkScanner,
    execute: () => 'Launching network scanner...'
  },
  
  devices: {
    execute: () => 'devices'  // Special command handled in Terminal
  },
  
  ips: {
    execute: () => 'devices'  // Alias for devices
  },
  
  crack: {
    gameComponent: PasswordCracker,
    execute: () => 'Launching password cracker...'
  },
  
  ssh: {
    gameComponent: SshLogin,
    execute: () => 'Usage: ssh <ip-address>'
  },
  
  decrypt: {
    gameComponent: FileDecryptor,
    execute: () => 'Initializing file decryption utility...'
  },
  
  firewall: {
    gameComponent: FirewallBreach,
    execute: () => 'Usage: firewall <ip-address>'
  },
  
  phish: {
    gameComponent: PhishingSimulator,
    execute: () => 'Usage: phish <target>'
  },
  
  crypto: {
    gameComponent: CryptographyChallenge,
    execute: () => 'Usage: crypto <encrypted-message>'
  },
  
  malware: {
    gameComponent: MalwareAnalyzer,
    execute: () => 'Usage: malware <sample>'
  },
  
  social: {
    gameComponent: SocialEngineering,
    execute: () => 'Usage: social <target>'
  },
  
  forensic: {
    gameComponent: DigitalForensics,
    execute: () => 'Usage: forensic <artifact>'
  },
  
  clear: () => '',
  
  invalid: () => `Command not found. Type "help" for available commands`
};
