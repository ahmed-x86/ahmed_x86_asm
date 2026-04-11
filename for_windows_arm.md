
# Developing for Windows ARM64 on Arch Linux

To develop, compile, and link Assembly code specifically for the **Windows ARM64** architecture while using **Arch Linux**, you must install the LLVM-based MinGW toolchain. Standard GCC-MinGW packages typically only support x86 and x86_64.

The following package provides the necessary cross-compilation tools (like `clang` and `lld`) to target the Windows ARM64 environment and its unique Calling Convention.

### Prerequisites

You can install the toolchain from the AUR using your preferred helper (e.g., `yay`):

```bash
yay -S llvm-mingw-w64-toolchain-ucrt-bin
```

### Compilation Command

Once installed, you can compile your Assembly files using the following command structure. This tells the compiler to bypass standard startup files and specifically target the ARM64 entry point:

```bash
/opt/llvm-mingw/llvm-mingw-ucrt/bin/aarch64-w64-mingw32-clang "your_file.s" -o "your_file.exe" -nostartfiles -lkernel32 -Wl,-e_start
```

### Physics Note
Please note that while this allows you to **build** the binary on Arch Linux, executing it requires a native Windows ARM64 environment or highly specific hardware emulation, as it is physically impossible to run ARM64 Windows instructions directly on an x86_64 processor without a translation layer.
