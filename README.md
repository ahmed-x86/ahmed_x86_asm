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
  <img src="https://badgen.net/badge/Version/1.1.9/blue?style=flat-square" alt="Version">
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

- **🗑️ Auto-Cleanup Temporary Files (New in v1.1.9!)**: Keep your project folders clean! The extension can now automatically delete temporary build files (`.obj`, `.o`, `.err`, `.lst`) after a successful run. Completely customizable via settings (`ahmed-x86-asm.cleanup.enabled` and `ahmed-x86-asm.cleanup.extensions`).
- **💡 Smart Hover Logs (New in v1.1.8!)**: Say goodbye to opening separate `.err` files! Simply hover your mouse over the red error squiggles in your code, and an elegant pop-up will instantly display the complete compiler error log. Debugging Assembly has never been this seamless!
- **📜 Transparent Build Logging & Error Prevention (Added in v1.1.7)**: See exactly what's happening under the hood! The extension logs every build command (`nasm`, `gcc`, `ld`) directly to the terminal for full transparency. If a compilation or linker error occurs, it smartly halts execution immediately to prevent messy cascading errors, letting you see the exact log without terminal spam!
- **🔍 Inline Error Diagnostics (Added in v1.1.5)**: A built-in intelligent linter that runs the assembler (`nasm`/`uasm`) in the background. If there's a syntax error, it halts execution and highlights the exact word with a red squiggle and a custom gutter icon directly in your code.
- **🤖 Smart Auto-Detect**: Automatically analyzes your code keywords to instantly recommend the perfect build mode (see table below).
- **🎛️ Manual Win32 Linker Override**: You now have full manual control to switch between `ld` and `gcc` linkers directly from the Command Palette, ensuring maximum stability across different Windows environments.
- **🖥️ Sequential Terminal Execution**: Commands are sent sequentially to the terminal instead of a single giant chained command. This means a dramatically cleaner output, easier debugging, and a much smoother visual experience when compiling.
- **📦 Smart Dependency Checker (Enhanced)**: Automatically verifies if required tools (nasm, gcc, uasm, wine) are installed via a sleek notification stack. **If any tool is missing, it automatically opens the [Installation Guide](https://ahmed-x86.github.io/ahmed_x86_asm.html) in your browser to help you get set up instantly.**
- **🔗 Dynamic Linker Optimizer**: Automatically runs a silent background test to detect and adopt the most stable Windows linking method (`ld` vs `gcc`) for your specific OS (Windows 10/11), preventing compilation errors.
- **📝 Quick Snippets**: Instantly generate full assembly boilerplate code using fast prefix keywords (see Snippets section).
- **🧹 Auto-Clear Terminal**: Keeps your workspace clean by automatically clearing the terminal before every new run.
- **⚡ One-Click Execution**: Integrated directly into the editor's Run button menu.
- **🧠 Dynamic Irvine Path**: Prompts you to select your Irvine library folder only once and saves it globally. (Includes a reset command if you move your folder).
- **🐧 Linux Build Modes (10 Options)**: Includes Native 32/64-bit and cross-compiling Win32/Win64 via Wine.
- **🪟 Windows Build Modes (6 Options)**: Includes Standard and Custom `main` configurations.
- **⚙️ Multi-Assembler Support**: Smartly utilizes `NASM` for standalone builds and `UASM` for Irvine library projects.
- **📁 Broad Compatibility**: Automatically detects a wide range of assembly extensions (`.asm`, `.s`, `.S`, `.inc`, `.nasm`, `.masm`, `.uasm`).

---

## 🎛️ Extension Commands
You can access these features at any time via the Command Palette (`Ctrl + Shift + P`):
- `Check ASM Dependencies (ahmed_x86)`: Scans your system to verify all required compilers and linkers are installed.
- `Reset Irvine Library Path`: Clears your saved Irvine directory so you can select a new one.
- `Change Win32 Linker Method (ahmed_x86)`: Manually switch your Windows linker preference between `ld` and `gcc`.
- `Reset Win32 Linker to Auto (ahmed_x86)`: Clears your automatically or manually adopted Windows linker preference, forcing the extension to re-test the best linking method on your next run.

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
6. Watch the magic happen. If you have errors, check your code for the red squiggles, hover over them to see the log, or check the pop-up alerts; otherwise, enjoy your clean terminal output!

---

## 🤝 Contributing & Feedback
If you have suggestions, bug reports, or want to contribute to the codebase, feel free to open an issue or a pull request on the [GitHub Repository](https://github.com/ahmed-x86/ahmed_x86_asm).

> **⭐ Notice:** If you find this extension useful, please consider leaving a 5-star rating on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ahmed-x86.ahmed-x86-asm)!

---

## 👨‍💻 Author
Created with 💻 & ☕ by **ahmed-x86**

repo **[ahmed-x86 asm](https://github.com/ahmed-x86/ahmed_x86_asm)**
