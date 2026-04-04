# 🚀 ahmed_x86_asm

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=ahmed-x86.ahmed-x86-asm">
    <img src="https://img.shields.io/badge/Available%20for-VS%20Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="VS Code">
  </a>
  <a href="https://vscodium.com/">
    <img src="https://img.shields.io/badge/Works%20on-VSCodium-2F80ED?style=for-the-badge&logo=vscodium&logoColor=white" alt="VSCodium">
  </a>
</p>

<p align="center">
  <img src="https://badgen.net/badge/Version/1.0.7/blue?style=flat-square" alt="Version">
  <img src="https://badgen.net/badge/Platform/Linux%20|%20Windows/cyan?style=flat-square" alt="Platform">
  <a href="https://github.com/ahmed-x86/ahmed_x86_asm/stargazers">
    <img src="https://img.shields.io/github/stars/ahmed-x86/ahmed_x86_asm?style=flat-square&color=yellow&logo=github" alt="GitHub Stars">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=ahmed-x86.ahmed-x86-asm">
    <img src="https://img.shields.io/visual-studio-marketplace/i/ahmed-x86.ahmed-x86-asm?style=flat-square&color=success&logo=visualstudiocode" alt="Marketplace Installs">
  </a>
</p>

A powerful, all-in-one Visual Studio Code / VSCodium extension to instantly compile and run **x86/x64 Assembly** code directly from your editor. Now supporting both **Linux** and **Windows** with a seamless workflow for native and cross-platform Assembly development.

---
## ✨ Features

- **🤖 Smart Auto-Detect**: Automatically analyzes your code keywords to instantly recommend the perfect build mode (see table below).
- **📝 Quick Snippets**: Instantly generate full assembly boilerplate code using fast prefix keywords (see Snippets section).
- **🧹 Auto-Clear Terminal**: Keeps your workspace clean by automatically clearing the terminal before every new run.
- **⚡ One-Click Execution**: Integrated directly into the editor's Run button menu.
- **🧠 Dynamic Irvine Path**: Prompts you to select your Irvine library folder only once and saves it globally. (Includes a reset command if you move your folder).
- **🐧 Linux Build Modes (10 Options)**: Includes Native 32/64-bit and cross-compiling Win32/Win64 via Wine.
- **🪟 Windows Build Modes (6 Options)**: Includes Standard and Custom `main` configurations.
- **⚙️ Multi-Assembler Support**: Smartly utilizes `NASM` for standalone builds and `UASM` for Irvine library projects.
- **📁 Broad Compatibility**: Automatically detects a wide range of assembly extensions (`.asm`, `.s`, `.S`, `.inc`, `.nasm`, `.masm`, `.uasm`).

---


## 📝 Snippets & Templates

Stop writing boilerplate from scratch! Type any of the following prefixes in an empty `.asm` file and press `Tab` or `Enter` to generate a complete template:

### 🐧 Linux Native Templates
| Prefix | Description |
| :--- | :--- |
| `linux32-main` | Linux 32-bit boilerplate using `main` |
| `linux32-start` | Linux 32-bit boilerplate using `_start` |
| `linux64-main` | Linux 64-bit boilerplate using `main` |
| `linux64-start` / `arch-start` | Linux 64-bit boilerplate using `_start` (Prints *"i use Archlinux BTW"*) |


### 🪟 Windows API / Standalone Templates
| Prefix | Description |
| :--- | :--- |
| `win32-std-main` | Win32 pure Windows API using `main` |
| `win32-std-start` | Win32 pure Windows API using `_start` |
| `win64-std-main` | Win64 pure Windows API using `main` |
| `win64-std-start` | Win64 pure Windows API using `_start` |

---

## 🛠️ Requirements

### 🐧 For Linux Users:
Ensure your system has the following dependencies installed:
- `nasm` *(For standard Linux/Windows builds)*
- `uasm` *(For Irvine library support)*
- `binutils` *(Provides `ld` for Linux linking)*
- `mingw-w64-gcc` *(For linking Windows executables)*
- `wine` *(To run compiled Windows `.exe` files seamlessly on Linux)*

### 🪟 For Windows Users:
Ensure your system has an **MSYS2** environment set up with the following:
- `MSYS2` installed at `C:\msys64`
- `mingw-w64-x86_64-gcc` and `mingw-w64-i686-gcc` toolchains.
- `nasm.exe` and `uasm.exe` placed in your MinGW bin directories (`C:\msys64\mingw64\bin`).

*(Note: The extension will alert you if you attempt to run it on an unsupported OS like macOS).*

---

## 🎯 How to Use

1. Open any Assembly file in VSCodium / VS Code.
2. Type a snippet prefix (e.g., `arch-start`) and press `Tab` to instantly load a template.
3. Click the drop-down arrow next to the **Play (Run)** button in the top right corner.
4. Select **Run x86 Assembly (ahmed_x86)**.
5. Choose the **✨ Auto Detect** option (or manually select a build mode).
6. Watch the magic happen in the integrated, auto-cleaned terminal!

---

## 🤝 Contributing & Feedback
If you have suggestions, bug reports, or want to contribute to the codebase, feel free to open an issue or a pull request on the [GitHub Repository](https://github.com/ahmed-x86/ahmed_x86_asm).

> **⭐ Notice:** If you find this extension useful, please consider leaving a 5-star rating on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ahmed-x86.ahmed-x86-asm)!

---

## 👨‍💻 Author
Created with 💻 & ☕ by **ahmed-x86**