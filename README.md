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
  <img src="https://badgen.net/badge/Version/1.3.8/blue?style=flat-square" alt="Version">
  <img src="https://badgen.net/badge/Platform/Linux%20|%20Windows%20|%20macOS%20|%20FreeBSD%20|%20ARM64%20|%20ARM32%20|%20RISC-V%20|%20MIPS%20|%20FASM/cyan?style=flat-square" alt="Platform">
  <a href="https://github.com/ahmed-x86/ahmed_x86_asm/stargazers">
    <img src="https://img.shields.io/github/stars/ahmed-x86/ahmed_x86_asm?style=flat-square&color=yellow&logo=github" alt="GitHub Stars">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=ahmed-x86.ahmed-x86-asm">
    <img src="https://img.shields.io/visual-studio-marketplace/i/ahmed-x86.ahmed-x86-asm?style=flat-square&color=success&logo=visualstudiocode" alt="Marketplace Installs">
  </a>
</p>

A powerful, all-in-one Visual Studio Code / VSCodium extension to instantly compile and run **x86/x64, ARM64, ARM32, RISC-V, MIPS & FASM Assembly** code directly from your editor. Now supporting **Linux**, **Windows**, **macOS (via Darling)**, and **FreeBSD (via QEMU)** with a seamless cross-platform workflow for native and cross-platform Assembly development.

---

## ✨ Features
- **🪐 Linux RISC-V 64-bit Support (New in v1.3.8!)**: Enter the future of open hardware! You can now cross-compile and run RISC-V 64-bit Linux Assembly using the `_start` entry point directly from your Linux machine using `qemu-riscv64-static`.
- **⚓ FreeBSD 32-bit (main) Support (New in v1.3.7!)**: We went deeper! You can now cross-compile FreeBSD 32-bit Assembly using the C-style `main` entry point. It fully supports FreeBSD's unique stack-based syscall convention right from your Linux terminal.
- **⚓ FreeBSD 32-bit (x86) Support (New in v1.3.6!)**: The BSD collection expands! You can now cross-compile FreeBSD 32-bit Assembly using the standard `_start` entry point with Stack-based Syscalls directly from Linux.
- **🍎 macOS ARM64 (Apple Silicon) Support (New in v1.3.5!)**: The ultimate breach! You can now cross-compile macOS ARM64 Assembly using the C-style `_main` entry point and `libSystem`. Perfect for building for M1/M2/M3 chips directly from your Arch Linux machine.
- **🦾 Windows ARM32 (main) Support (New in v1.3.4!)**: The ARM circle is now complete! You can now cross-compile Windows ARM32 (AArch32/armv7) Assembly using the C-style `main` entry point, allowing seamless integration with the C Runtime on 32-bit ARM hardware.
- **🦾 Windows ARM32 Cross-Compilation (New in v1.3.3!)**: Breaking more physical boundaries! You can now cross-compile Windows ARM32 (AArch32/armv7) Assembly using `_start`. It compiles perfectly on Arch Linux, but reminds you that your x86_64 atoms still can't natively run ARM32 code!
- **🦾 Windows ARM64 (main) Support (New in v1.3.2!)**: The saga continues! You can now cross-compile Windows ARM64 Assembly using the C-style `main` entry point. Perfect for projects integrating with the C Runtime on ARM hardware.
- **🪟 Windows ARM64 Cross-Compilation (New!)**: The ultimate flex! You can now cross-compile Windows ARM64 Assembly directly from your Linux machine. It compiles perfectly, but outputs a fun physics reminder since you can't natively run it on x86_64!
- **🍷 Smart Wine Log Control (New in v1.3.0!)**: Say goodbye to annoying GPU and Mesa warnings when running Windows apps on Linux! You can now easily toggle Wine logs (ON/OFF) directly from the Tools & Settings menu for a perfectly clean terminal output.
- **🦾 Linux ARM32 (main) Support (New in v1.2.9!)**: Complete the set! You can now compile and run ARM32 (AArch32) Assembly using the C-style `main` entry point seamlessly, completing the ARM support lineup.
- **🦾 Linux ARM64 (main) Support (New in v1.2.8!)**: Full flexibility! You can now compile and run ARM64 Assembly using the C-style `main` entry point seamlessly, in addition to the standard `_start`.
- **🚀 Universal Assembly Mode Support (New in v1.2.7!)**: Total freedom! The extension now supports and detects almost every Assembly flavor, including **MASM (case-insensitive)**, **FASM**, **MIPS**, **UASM**, and **RISC-V**. Even if you manually change the language mode in the status bar or use other ASM extensions, the "Run" and "Info" buttons will stay active and ready to work.
- **🦾 Linux ARM32 Support (New in v1.2.6!)**: The legacy lives on! You can now write and run **ARM32 (AArch32)** Assembly directly on your Linux machine. Utilizing `arm-none-eabi-as` for assembling and `qemu-arm-static` for execution, perfect for learning embedded systems and mobile architecture.
- **🦾 Linux ARM64 Support (New in v1.2.5!)**: Expand your horizons! You can now write, compile, and run **ARM64 (AArch64)** Assembly code directly on your x86_64 Linux machine. Utilizing `aarch64-linux-gnu-as` for assembling and `qemu-aarch64-static` for execution, bringing mobile and server-grade architecture development to your desktop.
- **⚓ FreeBSD Cross-Compilation (Enhanced in v1.2.4!)**: The BSD Gateway is open! You can now compile and run FreeBSD 64-bit Assembly code directly on Linux using both standard `_start` and C-style `main` entry points. Utilizing `ld.lld` (LLVM Linker) for linking and `qemu-x86_64-static` for execution, bringing BSD development to your Linux environment seamlessly.
- **🍎 macOS Cross-Compilation (Added in v1.2.2)**: Break the OS boundaries! You can now compile, link, and run macOS Mach-O 64-bit Assembly code directly from Linux. Utilizing `osxcross` for linking and `Darling` for execution, bringing Apple development to your Linux environment.
- **🧰 Unified Tools & Settings Menu (Added in v1.2.1)**: Declutter your workflow! We've added a dedicated "Info" icon (`i`) right next to the Play button. Clicking it opens a sleek, unified interactive menu giving you instant access to all extension settings, dependency checkers, and linker configurations in one convenient place!
- **🐧 Linux Linker Override (Added in v1.2.0)**: Full manual control to switch between `ld` (Standard, best for pure ASM) and `gcc` (Best for C-Library integration) directly from the Command Palette on Linux, maximizing flexibility!
- **🗑️ Auto-Cleanup Temporary Files (Added in v1.1.9)**: Keep your project folders clean! The extension can automatically delete temporary build files (`.obj`, `.o`, `.err`, `.lst`) after a successful run. Completely customizable via settings.
- **💡 Smart Hover Logs (Added in v1.1.8)**: Say goodbye to opening separate `.err` files! Simply hover your mouse over the red error squiggles in your code, and an elegant pop-up will instantly display the complete compiler error log.
- **📜 Transparent Build Logging & Error Prevention (Added in v1.1.7)**: See exactly what's happening under the hood! The extension logs every build command directly to the terminal for full transparency. 
- **🔍 Inline Error Diagnostics (Added in v1.1.5)**: A built-in intelligent linter that runs the assembler in the background, highlighting the exact word with a red squiggle and a custom gutter icon. Now supporting NASM, UASM, and GAS (for ARM and RISC-V).
- **🤖 Smart Auto-Detect**: Automatically analyzes your code keywords (like `svc #0`, `ecall`, `riscv64`, `freebsd`, `macho64`, `irvine32`, `win-arm64`) to instantly recommend the perfect build mode.
- **🎛️ Manual Win32/Linux Linker Override**: Full manual control to switch between `ld` and `gcc` linkers to ensure maximum stability.
- **🖥️ Sequential Terminal Execution**: Commands are sent sequentially to the terminal for a cleaner output and easier debugging.
- **📦 Smart Dependency Checker (Enhanced)**: Automatically verifies if required tools (nasm, gcc, uasm, wine, darling, lld, qemu, cross-compilers) are installed. **If any tool is missing, it automatically opens the [Installation Guide](https://ahmed-x86.github.io/ahmed_x86_asm.html).**
- **⚡ One-Click Execution**: Integrated directly into the editor's Run button menu.
- **🧠 Dynamic Irvine Path**: Persistent path saver for the `Irvine32.inc` library.
- **📁 Broad Compatibility**: Automatically detects a wide range of assembly extensions (`.asm`, `.s`, `.S`, `.inc`, `.nasm`, `.masm`, `.uasm`, `.fasm`, `.mips`).

---

## 🎛️ Extension Commands
You can access these features at any time via the **new Tools & Settings button (ℹ️)** next to the Play button, or via the Command Palette (`Ctrl + Shift + P`):

- `ahmed-x86 ASM: Settings & Tools`: Opens the unified interactive menu to manage all extension features.
- `Toggle Wine Log Visibility`: Show or hide Wine terminal warnings directly from the settings menu.
- `Check ASM Dependencies (ahmed_x86)`: Scans your system to verify tools like `nasm`, `gcc`, `wine`, `darling`, `lld`, `aarch64-linux-gnu-as`, `arm-none-eabi-as`, and `riscv64-linux-gnu-as`.
- `Reset Irvine Library Path`: Clears your saved Irvine directory path.
- `Change Linux/Win32 Linker Method`: Manually switch between `ld` and `gcc`.

---

## 📝 Snippets & Templates

Stop writing boilerplate from scratch! Type any of the following prefixes in an empty `.asm` or `.s` file and press `Tab` or `Enter` to generate a complete template:

### 🪐 RISC-V Templates
| Prefix | Description |
| :--- | :--- |
| `linux-riscv64-start` | Linux RISC-V 64-bit boilerplate using GNU Assembler (GAS) |

### 🦾 ARM Templates
| Prefix | Description |
| :--- | :--- |
| `linux-arm32-main` | Linux ARM32 (AArch32) boilerplate using `main` |
| `linux-arm64-main` | Linux ARM64 (AArch64) boilerplate using `main` |
| `linux-arm32-start` | Linux ARM32 (AArch32) boilerplate using GNU Assembler (GAS) |
| `linux-arm64-start` | Linux ARM64 (AArch64) boilerplate using GNU Assembler (GAS) |
| `win-arm64-start` | Windows ARM64 boilerplate using `_start` (Cross-compile only) |
| `win-arm64-main` | Windows ARM64 boilerplate using C-style `main` (Cross-compile only) |
| `win-arm32-start` | Windows ARM32 boilerplate using `_start` (Cross-compile only) |
| `win-arm32-main` | Windows ARM32 boilerplate using C-style `main` (Cross-compile only) |

### FreeBSD Templates
| Prefix | Description |
| :--- | :--- |
| `freebsd64-start` | FreeBSD 64-bit boilerplate using Raw Syscalls and `_start` |
| `freebsd64-main` | FreeBSD 64-bit boilerplate using `main` |
| `freebsd32-start` | FreeBSD 32-bit boilerplate using Stack Syscalls and `_start` |
| `freebsd32-main` | FreeBSD 32-bit boilerplate using Stack Syscalls and `main` |

### 🍎 macOS (Mach-O) Templates
| Prefix | Description |
| :--- | :--- |
| `mac64-main` | macOS 64-bit boilerplate using Apple official `_main` and `libSystem` |
| `mac-arm64-main` | macOS ARM64 (Apple Silicon) boilerplate using `_main` |

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
- **For FreeBSD support:** `lld` (linker) and `qemu-user-static` (runner).
- **For Linux ARM64 support:** `aarch64-linux-gnu-binutils` and `qemu-aarch64-static`.
- **For Linux ARM32 support:** `arm-none-eabi-binutils` and `qemu-arm-static`.
- **For Linux RISC-V 64-bit support:** `riscv64-linux-gnu-binutils` and `qemu-riscv64-static`.
- **For Windows ARM (64/32) support:** `llvm-mingw-w64-toolchain-ucrt-bin` (AUR).

### 🪟 For Windows Users:
Ensure your system has an **MSYS2** environment set up with:
- `mingw-w64` toolchains and `nasm.exe` in your PATH.

---

## 🎯 How to Use

1. Open any Assembly file in VSCodium / VS Code.
2. Type a snippet prefix (e.g., `linux-riscv64-start` or `linux-arm32-main`) and press `Tab`.
3. Click the drop-down arrow next to the **Play (Run)** button.
4. Select **Run Assembly (ahmed_x86)**.
5. Watch your code compile and run seamlessly!

---

## 🤝 Contributing & Feedback
Feel free to open an issue or a pull request on the [GitHub Repository](https://github.com/ahmed-x86/ahmed_x86_asm).

> **⭐ Notice:** If you find this extension useful, please consider leaving a 5-star rating on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ahmed-x86.ahmed-x86-asm)!

---

## 👨‍💻 Author
Created with 💻 & ☕ by **ahmed-x86**

repo **[ahmed-x86 asm](https://github.com/ahmed-x86/ahmed_x86_asm)**
