# 🍎 The Mach-O Bridge
### **macOS Cross-Compilation & Execution on Arch Linux**

This guide documents the complete workflow to transform an Arch Linux system into a full-blown development environment capable of **Assembling, Linking, and Running** macOS binaries (Mach-O format) natively on Linux.

---

## 🚀 Phase 1: Initial AUR Setup & Darling Environment
We begin by attempting to install the core components from the Arch User Repository (AUR).

```bash
# Using 'yay' to fetch the runner and the cross-linker
yay -S darling-bin osxcross-git
```

### 🔹 What Happened?
1.  **Darling Success:** `darling-bin` (the Darwin/macOS emulation layer) installed successfully as a pre-compiled package.
2.  **osxcross Failure:** The `osxcross-git` package failed due to a **404 Not Found** error.
    * **Reason:** The AUR package relies on a dead link for the `MacOSX10.11.sdk`. Apple frequently removes older SDKs from its servers.

### 🔹 Activating the Darling Kernel (Optional/User-space)
To ensure the environment is ready for execution, you might need to enable the kernel module or initialize the userspace server:
```bash
# Note: Modern Darling uses a userspace server (darlingserver), 
# but legacy installs might require the kernel module:
yay -S darling-mach-dkms-git
sudo modprobe darling-mach
```

---

## 🛠️ Phase 2: Manual Construction of `osxcross`
To bypass the dead SDK links, we manually build `osxcross` using a modern SDK (11.3).

### 1. Install Essential Dependencies
```bash
sudo pacman -S --needed clang cmake libxml2 zlib openssl pbzip2 mpdecimal
sudo pacman -S lld
```

### 2. Clone the Official Repository
```bash
git clone https://github.com/tpoechtrager/osxcross.git
cd osxcross
```

### 3. Fetching the SDK "The Manual Way"
We download the `MacOSX11.3.sdk` from a verified mirror and place it in the `tarballs/` directory:
```bash
wget -nc https://github.com/joseluisq/macosx-sdks/releases/download/11.3/MacOSX11.3.sdk.tar.xz -P tarballs/
```

### 4. Initiate the Build Process
Run the build script in unattended mode (this takes several minutes depending on CPU power):
```bash
UNATTENDED=1 ./build.sh
```

---

## ⚙️ Phase 3: System Integration & Global Configuration
Once built, we must make the macOS tools available system-wide and ensure the linker can find its shared libraries.

### 1. Copying to Global Binaries
```bash
sudo cp -r target/bin/* /usr/local/bin/
sudo cp -r target/lib/* /usr/local/lib/
sudo mkdir -p /usr/local/SDK/
sudo cp -r target/SDK/* /usr/local/SDK/ 2>/dev/null || true
```

### 2. Resolving Shared Library Issues (`libtapi`, `libxar`)
If the linker fails to find shared objects, we must register `/usr/local/lib` in the system's dynamic linker cache:

```bash
# Create a new configuration file for local libraries
echo "/usr/local/lib" | sudo tee /etc/ld.so.conf.d/usr-local.conf

# Update the linker cache
sudo ldconfig
```

---

## ✅ Environment Verification
To confirm that your Linux system can now generate macOS binaries, verify the linker version:

```bash
x86_64-apple-darwin20.4-ld -v
```

> **Result:** If the version info (e.g., `PROJECT:ld64-711`) appears without errors, your **Arch-macOS Gateway** is officially open! 🌍🔥

---

### **Summary of Build Commands (for extension.ts)**
| Step | Command |
| :--- | :--- |
| **Assemble** | `nasm -f macho64 code.asm -o code.o` |
| **Link** | `x86_64-apple-darwin20.4-ld code.o -o code -macosx_version_min 10.11 -lSystem -syslibroot /usr/local/SDK/MacOSX11.3.sdk` |
| **Run** | `darling shell ./code` |

---
