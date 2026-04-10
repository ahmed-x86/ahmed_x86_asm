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
  <img src="https://badgen.net/badge/Version/1.2.2/blue?style=flat-square" alt="Version">
  <img src="https://badgen.net/badge/Platform/Linux%20|%20Windows%20|%20macOS/cyan?style=flat-square" alt="Platform">
  <a href="https://github.com/ahmed-x86/ahmed_x86_asm/stargazers">
    <img src="https://img.shields.io/github/stars/ahmed-x86/ahmed_x86_asm?style=flat-square&color=yellow&logo=github" alt="GitHub Stars">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=ahmed-x86.ahmed-x86-asm">
    <img src="https://img.shields.io/visual-studio-marketplace/i/ahmed-x86.ahmed-x86-asm?style=flat-square&color=success&logo=visualstudiocode" alt="Marketplace Installs">
  </a>
</p>

A powerful, all-in-one Visual Studio Code / VSCodium extension to instantly compile and run **x86/x64 Assembly** code directly from your editor. Now supporting **Linux**, **Windows**, and **macOS (via Darling)** with a seamless cross-platform workflow for native and cross-platform Assembly development.

---
## ✨ Features

- **🍎 macOS Cross-Compilation (New in v1.2.2!)**: Break the OS boundaries! You can now compile, link, and run macOS Mach-O 64-bit Assembly code directly from Linux. Utilizing `osxcross` for linking and `Darling` for execution, bringing Apple development to your Linux environment.
- **🧰 Unified Tools & Settings Menu (Added in v1.2.1)**: Declutter your workflow! We've added a dedicated "Info" icon (`i`) right next to the Play button. Clicking it opens a sleek, unified interactive menu giving you instant access to all extension settings, dependency checkers, and linker configurations in one convenient place!
- **🐧 Linux Linker Override (Added in v1.2.0)**: Full manual control to switch between `ld` (Standard, best for pure ASM) and `gcc` (Best for C-Library integration) directly from the Command Palette on Linux, maximizing flexibility!
- **🗑️ Auto-Cleanup Temporary Files (Added in v1.1.9)**: Keep your project folders clean! The extension can automatically delete temporary build files (`.obj`, `.o`, `.err`, `.lst`) after a successful run. Completely customizable via settings.
- **💡 Smart Hover Logs (Added in v1.1.8)**: Say goodbye to opening separate `.err` files! Simply hover your mouse over the red error squiggles in your code, and an elegant pop-up will instantly display the complete compiler error log.
- **📜 Transparent Build Logging & Error Prevention (Added in v1.1.7)**: See exactly what's happening under the hood! The extension logs every build command directly to the terminal for full transparency. 
- **🔍 Inline Error Diagnostics (Added in v1.1.5)**: A built-in intelligent linter that runs the assembler in the background, highlighting the exact word with a red squiggle and a custom gutter icon.
- **🤖 Smart Auto-Detect**: Automatically analyzes your code keywords (like `macho64`, `irvine32`, `elf64`) to instantly recommend the perfect build mode.
- **🎛️ Manual Win32/Linux Linker Override**: Full manual control to switch between `ld` and `gcc` linkers to ensure maximum stability.
- **🖥️ Sequential Terminal Execution**: Commands are sent sequentially to the terminal for a cleaner output and easier debugging.
- **📦 Smart Dependency Checker (Enhanced)**: Automatically verifies if required tools (nasm, gcc, uasm, wine, darling) are installed. **If any tool is missing, it automatically opens the [Installation Guide](https://ahmed-x86.github.io/ahmed_x86_asm.html).**
- **⚡ One-Click Execution**: Integrated directly into the editor's Run button menu.
- **🧠 Dynamic Irvine Path**: Persistent path saver for the `Irvine32.inc` library.
- **📁 Broad Compatibility**: Automatically detects a wide range of assembly extensions (`.asm`, `.s`, `.S`, `.inc`, `.nasm`, `.masm`, `.uasm`).

---

## 🎛️ Extension Commands
You can access these features at any time via the **new Tools & Settings button (ℹ️)** next to the Play button, or via the Command Palette (`Ctrl + Shift + P`):

- `ahmed-x86 ASM: Settings & Tools`: Opens the unified interactive menu to manage all extension features.
- `Check ASM Dependencies (ahmed_x86)`: Scans your system to verify tools like `nasm`, `gcc`, `wine`, and `darling`.
- `Reset Irvine Library Path`: Clears your saved Irvine directory path.
- `Change Linux/Win32 Linker Method`: Manually switch between `ld` and `gcc`.

---

## 📝 Snippets & Templates

Stop writing boilerplate from scratch! Type any of the following prefixes in an empty `.asm` file and press `Tab` or `Enter` to generate a complete template:

### 🍎 macOS (Mach-O) Templates
| Prefix | Description |
| :--- | :--- |
| `mac64-main` | **(New!)** macOS 64-bit boilerplate using Apple official `_main` and `libSystem` |

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
- `nasm`, `uasm`, `binutils` (ld), `mingw-w64-gcc`, `wine`.
- **For macOS support:** `osxcross` (linker) and `darling` (runner).

### 🪟 For Windows Users:
Ensure your system has an **MSYS2** environment set up with:
- `mingw-w64` toolchains and `nasm.exe` in your PATH.

---

## 🎯 How to Use

1. Open any Assembly file in VSCodium / VS Code.
2. Type a snippet prefix (e.g., `mac64-main`) and press `Tab`.
3. Click the drop-down arrow next to the **Play (Run)** button.
4. Select **Run x86 Assembly (ahmed_x86)**.
5. Watch your code compile and run seamlessly!

---

## 🤝 Contributing & Feedback
Feel free to open an issue or a pull request on the [GitHub Repository](https://github.com/ahmed-x86/ahmed_x86_asm).

> **⭐ Notice:** If you find this extension useful, please consider leaving a 5-star rating on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ahmed-x86.ahmed-x86-asm)!

---

## 👨‍💻 Author
Created with 💻 & ☕ by **ahmed-x86**

repo **[ahmed-x86 asm](https://github.com/ahmed-x86/ahmed_x86_asm)**
