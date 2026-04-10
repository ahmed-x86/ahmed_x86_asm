import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs'; // <--- إضافة جديدة لكتابة ملف الاختبار الوهمي

// --- الإضافة الجديدة: أداة الاحتفاظ بالأخطاء وعرضها في المحرر ---
let diagnosticCollection: vscode.DiagnosticCollection;

// --- الإضافة الجديدة: تصميم الدائرة الحمراء بجانب رقم السطر ---
const errorGutterDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.parse(`data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Ccircle%20cx%3D%228%22%20cy%3D%228%22%20r%3D%224%22%20fill%3D%22%23e51400%22%2F%3E%3C%2Fsvg%3E`),
    gutterIconSize: '60%' // حجم الدائرة ليكون صغيراً ومناسباً
});

// دالة لتنفيذ أوامر الطرفية وجلب السطر الأول
async function runCmd(cmd: string): Promise<{ success: boolean, output: string }> {
    return new Promise((resolve) => {
        cp.exec(cmd, (error, stdout, stderr) => {
            const output = (stdout || stderr || '').trim();
            if (error && !stdout) {
                resolve({ success: false, output: '' });
            } else {
                // تنظيف المخرجات من أي أحرف غريبة قد تسبب مشاكل في العرض
                const firstLine = output.split('\n')[0].trim().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                resolve({ success: true, output: firstLine });
            }
        });
    });
}

// --- الإضافة الجديدة: دالة مساعدة لاستخراج الكلمة الخاطئة من الرسالة وتحديد مكانها ---
function getAccurateErrorRange(lineText: string, message: string, lineIndex: number): vscode.Range {
    let targetWord = "";
    
    // محاولة استخراج الكلمة بين علامات التنصيص (غالبًا مع NASM)
    const quoteMatch = message.match(/['`"]([^'`"]+)['`"]/);
    if (quoteMatch) {
        targetWord = quoteMatch[1];
    } 
    // محاولة استخراج الكلمة بعد النقطتين (غالبًا مع UASM مثل Error A2102: Symbol not defined : msg)
    else if (message.includes(':')) {
        const parts = message.split(':');
        targetWord = parts[parts.length - 1].trim();
    } 
    
    // تنظيف الكلمة المستخرجة
    targetWord = targetWord.replace(/[\[\]]/g, '');

    // إذا وجدنا الكلمة وكانت موجودة فعلاً في السطر، نضع الخط تحتها فقط
    if (targetWord && lineText.includes(targetWord)) {
        const startChar = lineText.indexOf(targetWord);
        return new vscode.Range(lineIndex, startChar, lineIndex, startChar + targetWord.length);
    }

    // كخيار بديل إذا فشل الاستخراج، نضع الخط تحت أول كلمة في السطر بدلاً من السطر كاملاً
    const trimmed = lineText.trimStart();
    const startChar = lineText.length - trimmed.length;
    const firstWordMatch = trimmed.match(/^\S+/);
    const endChar = firstWordMatch ? startChar + firstWordMatch[0].length : lineText.length;
    
    return new vscode.Range(lineIndex, startChar, lineIndex, endChar);
}

// --- الإضافة الجديدة: دالة لتشغيل أمر التجميع في الخلفية وتحليل الأخطاء (Diagnostics) ---
async function assembleAndDiagnose(assembleCmd: string, fileDir: string, document: vscode.TextDocument): Promise<boolean> {
    return new Promise((resolve) => {
        cp.exec(assembleCmd, { cwd: fileDir }, (error, stdout, stderr) => {
            const output = (stdout || '') + '\n' + (stderr || '');
            const diagnostics: vscode.Diagnostic[] = [];
            const errorRanges: vscode.Range[] = []; // مصفوفة لحفظ أماكن الدوائر الحمراء

            // Regex لاصطياد أخطاء NASM
            const nasmRegex = /^(?:[^:]+):(\d+):\s+(error|warning|fatal):\s+(.*)$/gm;
            
            // Regex لاصطياد أخطاء UASM
            const uasmRegex = /^(?:[^(]+)\((\d+)\)\s+:\s+(Error|Fatal|Warning)\s+(.*)$/gm;

            // Regex لاصطياد أخطاء GNU Assembler (GAS) لمعمارية ARM
            const gasRegex = /^(?:[^:]+):(\d+)(?::\d+)?:?\s+(Error|Warning|Fatal):\s+(.*)$/gmi;

            let match;

            // فحص أخطاء NASM
            while ((match = nasmRegex.exec(output)) !== null) {
                const line = parseInt(match[1], 10) - 1; 
                const severityStr = match[2].toLowerCase();
                const message = match[3];

                const severity = severityStr.includes('warning') 
                    ? vscode.DiagnosticSeverity.Warning 
                    : vscode.DiagnosticSeverity.Error;

                const safeLine = Math.max(0, Math.min(line, document.lineCount - 1));
                const lineText = document.lineAt(safeLine).text;
                const range = getAccurateErrorRange(lineText, message, safeLine);
                
                diagnostics.push(new vscode.Diagnostic(range, `NASM: ${message}`, severity));
                errorRanges.push(range);
            }

            // فحص أخطاء UASM
            while ((match = uasmRegex.exec(output)) !== null) {
                const line = parseInt(match[1], 10) - 1;
                const severityStr = match[2].toLowerCase();
                const message = match[3];

                const severity = severityStr.includes('warning') 
                    ? vscode.DiagnosticSeverity.Warning 
                    : vscode.DiagnosticSeverity.Error;

                const safeLine = Math.max(0, Math.min(line, document.lineCount - 1));
                const lineText = document.lineAt(safeLine).text;
                const range = getAccurateErrorRange(lineText, message, safeLine);
                
                diagnostics.push(new vscode.Diagnostic(range, `UASM: ${message}`, severity));
                errorRanges.push(range);
            }

            // فحص أخطاء GNU Assembler (GAS)
            while ((match = gasRegex.exec(output)) !== null) {
                const line = parseInt(match[1], 10) - 1;
                const severityStr = match[2].toLowerCase();
                const message = match[3];

                const severity = severityStr.includes('warning') 
                    ? vscode.DiagnosticSeverity.Warning 
                    : vscode.DiagnosticSeverity.Error;

                const safeLine = Math.max(0, Math.min(line, document.lineCount - 1));
                const lineText = document.lineAt(safeLine).text;
                const range = getAccurateErrorRange(lineText, message, safeLine);
                
                diagnostics.push(new vscode.Diagnostic(range, `GAS: ${message}`, severity));
                errorRanges.push(range);
            }

            const editor = vscode.window.activeTextEditor;

            if (diagnostics.length > 0) {
                // عرض الأخطاء في المحرر (الخطوط الحمراء تحت الكلمة فقط)
                diagnosticCollection.set(document.uri, diagnostics);
                
                // رسم الدوائر الحمراء في الهامش
                if (editor && editor.document.uri.toString() === document.uri.toString()) {
                    editor.setDecorations(errorGutterDecoration, errorRanges);
                }

                vscode.window.showErrorMessage(`ahmed-x86 ASM: Found ${diagnostics.length} issue(s). Check the red squiggles in your code! ❌`);
                resolve(false); // توقف هنا، هناك خطأ في الكود
            } else {
                // مسح الأخطاء والدوائر القديمة إذا نجح التجميع
                diagnosticCollection.clear();
                if (editor) {
                    editor.setDecorations(errorGutterDecoration, []);
                }
                resolve(true); // الكود سليم، أكمل العملية
            }
        });
    });
}
// -----------------------------------------------------------------------------------

// دالة فحص الحزم باستخدام واجهة الإشعارات التقدمية (Progress Notification)
async function checkDependencies(platform: string) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "ahmed-x86 ASM:",
        cancellable: false
    }, async (progress) => {
        
        let messageItems: string[] = [];
        let hasMissing = false; // لمعرفة إذا كان هناك أي حزمة ناقصة
        progress.report({ message: "Checking dependencies..." });

        if (platform === 'linux') {
            const deps = [
                { name: 'nasm', cmd: 'nasm -v' },
                { name: 'binutils', cmd: 'ld -v' },
                { name: 'wine', cmd: 'wine --version' },
                { name: 'uasm', cmd: 'uasm -h' },
                { name: 'darling', cmd: 'darling --version' }, // فحص دارلينج
                { name: 'lld', cmd: 'ld.lld -v' }, // فحص LLVM Linker (لـ FreeBSD)
                { name: 'qemu-user-static', cmd: 'qemu-x86_64-static --version' }, // فحص المحاكي (لـ FreeBSD)
                { name: 'aarch64-as', cmd: 'aarch64-linux-gnu-as --version' }, // إضافة فحص ARM64
                { name: 'aarch64-ld', cmd: 'aarch64-linux-gnu-ld -v' }, // إضافة فحص ARM64
                { name: 'qemu-aarch64-static', cmd: 'qemu-aarch64-static --version' } // إضافة فحص ARM64
            ];

            const total = deps.length;
            for (let i = 0; i < total; i++) {
                const dep = deps[i];
                progress.report({ message: `Checking ${dep.name}...`, increment: (100 / total) });
                
                const res = await runCmd(dep.cmd);
                if (res.success && res.output) {
                    messageItems.push(`${dep.name} : Installed ✅`);
                } else {
                    messageItems.push(`${dep.name} : Not Installed ❌`);
                    hasMissing = true;
                }
            }
        } else if (platform === 'win32') {
            const deps = [
                { name: 'uasm', abs: 'C:\\msys64\\mingw64\\bin\\uasm.exe -h', global: 'uasm -h' },
                { name: 'nasm', abs: 'C:\\msys64\\mingw64\\bin\\nasm.exe -v', global: 'nasm -v' },
                { name: 'i686-gcc', abs: 'C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe --version', global: 'i686-w64-mingw32-gcc --version' },
                { name: 'x86_64-gcc', abs: 'C:\\msys64\\mingw64\\bin\\x86_64-w64-mingw32-gcc.exe --version', global: 'x86_64-w64-mingw32-gcc --version' }
            ];

            const total = deps.length;
            for (let i = 0; i < total; i++) {
                const dep = deps[i];
                progress.report({ message: `Checking ${dep.name}...`, increment: (100 / total) });
                
                const absRes = await runCmd(dep.abs);
                const globalRes = await runCmd(dep.global);

                const isInstalled = absRes.success || globalRes.success;
                
                if (isInstalled) {
                    messageItems.push(`${dep.name} : Installed ✅`);
                } else {
                    messageItems.push(`${dep.name} : Not Installed ❌`);
                    hasMissing = true;
                }
            }
        }

        // --- إضافة رسالة التثبيت إلى المصفوفة لتظهر بنفس النمط ---
        if (hasMissing) {
            messageItems.push("for install package");
        }

        // خدعة التأخير الزمني لكي تظهر جميع الإشعارات متراصة دون أن يخفيها VS Code
        if (messageItems.length > 0) {
            vscode.window.showInformationMessage("🔍 ahmed-x86 Dependencies:");
            for (const msg of messageItems) {
                // تأخير 300 ملي ثانية بين كل إشعار والثاني
                await new Promise(resolve => setTimeout(resolve, 300));
                vscode.window.showInformationMessage(msg);
                
                // فتح الموقع تلقائياً إذا كانت الرسالة المعروضة هي رابط التثبيت
                if (msg === "for install package") {
                    vscode.env.openExternal(vscode.Uri.parse('https://ahmed-x86.github.io/ahmed_x86_asm.html'));
                }
            }
        }
    });
}

// دالة مساعدة للحصول على مسار مكتبة Irvine وحفظه
async function getIrvinePath(context: vscode.ExtensionContext): Promise<string | undefined> {
    let irvinePath = context.globalState.get<string>('irvineLibPath');

    if (!irvinePath) {
        const uri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Irvine Library Folder',
            title: 'Please select the folder containing Irvine32.lib'
        });

        if (uri && uri[0]) {
            irvinePath = uri[0].fsPath;
            await context.globalState.update('irvineLibPath', irvinePath);
            vscode.window.showInformationMessage(`Irvine library path saved successfully: ${irvinePath}`);
        } else {
            vscode.window.showErrorMessage('Irvine library path is required to use this build option! 😅');
            return undefined;
        }
    }
    return irvinePath;
}

// --- الإضافة الجديدة: دالة الاختبار الصامت لاختيار أفضل طريقة ربط (Linker) في الويندوز ---
async function detectBestWin32Linker(context: vscode.ExtensionContext): Promise<string> {
    let method = context.globalState.get<string>('win32LinkerMethod');
    if (method) return method;

    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "ahmed-x86 ASM: Optimizing Windows linker...",
        cancellable: false
    }, async (progress) => {
        const tmpdir = os.tmpdir();
        const dummyAsm = path.join(tmpdir, 'ahmed_dummy.asm');
        const dummyObj = path.join(tmpdir, 'ahmed_dummy.obj');
        const dummyExe = path.join(tmpdir, 'ahmed_dummy.exe');

        fs.writeFileSync(dummyAsm, 'global _main\nsection .text\n_main:\nret\n');
        await runCmd(`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${dummyAsm}" -o "${dummyObj}"`);

        let bestMethod = 'gcc'; 
        const ldCmd = `C:\\msys64\\mingw32\\bin\\ld.exe "${dummyObj}" -o "${dummyExe}" -lkernel32 -luser32 -e _main -L C:\\msys64\\mingw32\\lib`;
        const ldRes = await runCmd(ldCmd);

        if (ldRes.success) {
            bestMethod = 'ld'; 
        } else {
            const gccCmd = `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${dummyObj}" -o "${dummyExe}" -nostartfiles -lkernel32 -luser32 -Wl,-e_main`;
            const gccRes = await runCmd(gccCmd);
            if (gccRes.success) {
                bestMethod = 'gcc';
            }
        }

        try {
            if (fs.existsSync(dummyAsm)) fs.unlinkSync(dummyAsm);
            if (fs.existsSync(dummyObj)) fs.unlinkSync(dummyObj);
            if (fs.existsSync(dummyExe)) fs.unlinkSync(dummyExe);
        } catch (e) {}

        await context.globalState.update('win32LinkerMethod', bestMethod);
        vscode.window.showInformationMessage(`Linker method adopted: ${bestMethod.toUpperCase()} ✅`);
        return bestMethod;
    });
}
// --------------------------------------------------------------------------

// دالة ذكية لتحليل الكود وتوقع خيار التشغيل المناسب
function detectBestOption(fileText: string, platform: string): { index: number, name: string } {
    const textLower = fileText.toLowerCase();
    
    // البحث عن الكلمات المفتاحية
    const hasIrvine = textLower.includes('irvine32.inc');
    const hasMain = textLower.includes('main proc') || textLower.includes('main:');
    const is64Bit = textLower.includes('bits 64') || textLower.includes('elf64') || textLower.includes('win64') || textLower.includes('rax');
    const isMac = textLower.includes('macho64');
    const isFreeBSD = textLower.includes('freebsd') || textLower.includes('fbsd'); // تعرف تلقائي لـ FreeBSD
    const isArm64 = textLower.includes('aarch64') || textLower.includes('svc #0'); // إضافة لـ ARM64

    if (platform === 'linux') {
        if (isArm64) return { index: 14, name: "Linux ARM64 (_start)" }; // إضافة ARM64
        if (isFreeBSD) return hasMain ? { index: 13, name: "FreeBSD 64-bit (main)" } : { index: 12, name: "FreeBSD 64-bit (_start)" }; // أولوية FreeBSD إذا تم اكتشافه مع التمييز بين main و _start
        if (isMac) return { index: 11, name: "Mac64 Native (Darling)" };
        if (hasIrvine) return hasMain ? { index: 8, name: "Win32 Irvine (main)" } : { index: 5, name: "Win32 Irvine" };
        if (is64Bit) return hasMain ? { index: 2, name: "Linux64 Native (main)" } : { index: 1, name: "Linux64 Native (_start)" };
        return hasMain ? { index: 4, name: "Linux32 Native (main)" } : { index: 3, name: "Linux32 Native (_start)" };
    } else {
        // Windows (win32)
        if (hasIrvine) return hasMain ? { index: 4, name: "Win32 Irvine (Custom main)" } : { index: 1, name: "Win32 Irvine (Standard)" };
        if (is64Bit) return hasMain ? { index: 6, name: "Win64 Standalone (Custom main)" } : { index: 3, name: "Win64 Standalone (Standard)" };
        return hasMain ? { index: 5, name: "Win32 Standalone (Custom main)" } : { index: 2, name: "Win32 Standalone (Standard)" };
    }
}

// --- الإضافة الجديدة (v1.1.9): دالة لتنظيف الملفات المؤقتة ---
async function cleanUpTempFiles(fileDir: string, baseName: string) {
    // قراءة الإعدادات الخاصة بالإضافة
    const config = vscode.workspace.getConfiguration('ahmed-x86-asm.cleanup');
    const isEnabled = config.get<boolean>('enabled', false);
    const extensionsToClean = config.get<string[]>('extensions', ['.obj', '.o', '.err', '.lst']);

    // إذا كانت الميزة معطلة، اخرج من الدالة
    if (!isEnabled) return;

    // المرور على الامتدادات ومحاولة حذف الملفات إن وجدت
    for (const ext of extensionsToClean) {
        const targetFile = path.join(fileDir, `${baseName}${ext}`);
        if (fs.existsSync(targetFile)) {
            try {
                fs.unlinkSync(targetFile);
            } catch (err) {
                console.error(`ahmed-x86 ASM: Could not delete ${targetFile}`, err);
            }
        }
    }
}
// --------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext) {
    const currentPlatform = os.platform();

    // --- الإضافة الجديدة: تهيئة مجموعة تشخيص الأخطاء ---
    diagnosticCollection = vscode.languages.createDiagnosticCollection('ahmed_x86_asm');
    context.subscriptions.push(diagnosticCollection);

    // فحص الحزم عند أول تشغيل للإضافة فقط
    const hasCheckedDeps = context.globalState.get<boolean>('hasCheckedDeps_v108');
    if (!hasCheckedDeps) {
        if (currentPlatform === 'linux' || currentPlatform === 'win32') {
            // تشغيل الفحص في الخلفية دون تعطيل عمل المستخدم
            checkDependencies(currentPlatform);
            context.globalState.update('hasCheckedDeps_v108', true); // حفظ الحالة
        }
    }

    // أمر فحص الحزم اليدوي
    let checkDepsDisposable = vscode.commands.registerCommand('ahmed-x86-asm.checkDeps', () => {
        checkDependencies(currentPlatform);
    });

    // أمر إعادة تعيين المسار
    let resetPathDisposable = vscode.commands.registerCommand('ahmed-x86-asm.resetIrvinePath', async () => {
        await context.globalState.update('irvineLibPath', undefined);
        vscode.window.showInformationMessage('Irvine library path has been reset. You will be prompted to select it again next time.');
    });

    // --- الإضافة الجديدة: أمر إعادة تعيين الـ Linker ---
    let resetLinkerDisposable = vscode.commands.registerCommand('ahmed-x86-asm.resetLinkerMethod', async () => {
        await context.globalState.update('win32LinkerMethod', undefined);
        vscode.window.showInformationMessage('Win32 Linker method has been reset. The extension will test again next run.');
    });
    // ----------------------------------------------------

    // --- ميزة v1.1.4 الجديدة: تغيير الـ Linker يدوياً ---
    let setLinkerDisposable = vscode.commands.registerCommand('ahmed-x86-asm.setLinkerMethod', async () => {
        const currentMethod = context.globalState.get<string>('win32LinkerMethod') || 'Auto (Not set)';
        
        const options = [
            { label: 'ld', description: 'Use GNU Linker (ld.exe)' },
            { label: 'gcc', description: 'Use GCC as Linker (gcc.exe)' }
        ];

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: `Select Win32 Linker Method | Current: ${currentMethod}`
        });

        if (selection) {
            await context.globalState.update('win32LinkerMethod', selection.label);
            vscode.window.showInformationMessage(`Win32 Linker method successfully set to: ${selection.label.toUpperCase()} ✅`);
        }
    });
    // ----------------------------------------------------

    // --- الإضافة الجديدة: أوامر التحكم في الـ Linker للينكس ---
    let resetLinuxLinkerDisposable = vscode.commands.registerCommand('ahmed-x86-asm.resetLinuxLinkerMethod', async () => {
        await context.globalState.update('linuxLinkerMethod', undefined);
        vscode.window.showInformationMessage('Linux Linker method has been reset to default (ld).');
    });

    let setLinuxLinkerDisposable = vscode.commands.registerCommand('ahmed-x86-asm.setLinuxLinkerMethod', async () => {
        const currentMethod = context.globalState.get<string>('linuxLinkerMethod') || 'ld';
        
        const options = [
            { label: 'ld', description: 'Use GNU Linker (Standard, best for pure ASM)' },
            { label: 'gcc', description: 'Use GCC (Best for C-Library integration)' }
        ];

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: `Select Linux Linker Method | Current: ${currentMethod}`
        });

        if (selection) {
            await context.globalState.update('linuxLinkerMethod', selection.label);
            vscode.window.showInformationMessage(`Linux Linker method successfully set to: ${selection.label.toUpperCase()} ✅`);
        }
    });
    // ----------------------------------------------------

    // أمر التشغيل الرئيسي
    let runDisposable = vscode.commands.registerCommand('ahmed-x86-asm.run', async () => {
        
        const platform = os.platform();
        
        if (platform !== 'linux' && platform !== 'win32') {
            vscode.window.showErrorMessage('This system is not supported yet! 😅');
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Oops, looks like no file is open! 😅');
            return;
        }

        const filePath = editor.document.fileName;
        const fileDir = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const baseName = path.parse(fileName).name; 

        // قراءة محتوى الملف لتحليله
        const fileText = editor.document.getText();
        const autoDetected = detectBestOption(fileText, platform);

        let options: string[] = [];
        let commands: string[] = []; // تم التعديل لتكون مصفوفة
        let selectedIndex = 0;

        // استدعاء المسار لعرضه
        const currentIrvinePath = context.globalState.get<string>('irvineLibPath') || "Not Set";

        if (platform === 'linux') {
            options = [
                `✨ Auto Detect: ${autoDetected.name}`,
                "1) Linux64 Native (_start)",
                "2) Linux64 Native (main)",
                "3) Linux32 Native (_start)",
                "4) Linux32 Native (main)",
                "5) Win32 Irvine",
                "6) Win32 Standalone",
                "7) Win64 Standalone",
                "8) Win32 Irvine (main)",
                "9) Win32 Standalone (main)",
                "10) Win64 Standalone (main)",
                "11) Mac64 Native (Darling)",
                "12) FreeBSD 64-bit (_start) (QEMU)",
                "13) FreeBSD 64-bit (main) (QEMU)",
                "14) Linux ARM64 (_start) (QEMU)" // الإضافة الجديدة لـ ARM64
            ];

            const selection = await vscode.window.showQuickPick(options, {
                placeHolder: `Choose build mode (Linux) | Irvine Path: ${currentIrvinePath}`
            });

            if (!selection) return;

            // تحديد الـ Index بناءً على اختيار المستخدم
            if (selection.startsWith('✨ Auto Detect')) {
                selectedIndex = autoDetected.index;
            } else {
                selectedIndex = parseInt(selection.split(')')[0]);
            }

            let irvinePath = "";

            if (selectedIndex === 5 || selectedIndex === 8) {
                const pathResult = await getIrvinePath(context);
                if (!pathResult) return; 
                irvinePath = pathResult;
            }

            // --- الإضافة الجديدة: فحص خيار الـ Linker الخاص بلينكس ---
            const linuxLinkerMethod = context.globalState.get<string>('linuxLinkerMethod') || 'ld';

            if (linuxLinkerMethod === 'gcc') {
                // أوامر لينكس المقسمة (باستخدام gcc كـ Linker)
                switch (selectedIndex) {
                    case 1: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `gcc "${baseName}.o" -o "${baseName}" -nostdlib`, `./"${baseName}"`]; break;
                    case 2: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `gcc "${baseName}.o" -o "${baseName}" -no-pie`, `./"${baseName}"`]; break;
                    case 3: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `gcc -m32 "${baseName}.o" -o "${baseName}" -nostdlib`, `./"${baseName}"`]; break;
                    case 4: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `gcc -m32 "${baseName}.o" -o "${baseName}" -no-pie`, `./"${baseName}"`]; break;
                    case 5: commands = [`uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o"`, `i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 6: commands = [`nasm -f win32 "${fileName}" -o "${baseName}.obj"`, `i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 7: commands = [`nasm -f win64 "${fileName}" -o "${baseName}.obj"`, `x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 8: commands = [`uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o"`, `i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -Wl,-e_main`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 9: commands = [`nasm -f win32 "${fileName}" -o "${baseName}.obj"`, `i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-e_main`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 10: commands = [`nasm -f win64 "${fileName}" -o "${baseName}.obj"`, `x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-emain`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 11: commands = [
                        `nasm -f macho64 "${fileName}" -o "${baseName}.o"`, 
                        `x86_64-apple-darwin20.4-ld "${baseName}.o" -o "${baseName}" -macosx_version_min 10.11 -lSystem -syslibroot /usr/local/SDK/MacOSX11.3.sdk`, 
                        `darling shell ./"${baseName}"`
                    ]; break;
                    case 12: commands = [
                        `nasm -f elf64 "${fileName}" -o "${baseName}.o"`, 
                        `ld.lld -m elf_x86_64_fbsd "${baseName}.o" -o "${baseName}"`, 
                        `qemu-x86_64-static ./"${baseName}"`
                    ]; break;
                    case 13: commands = [
                        `nasm -f elf64 "${fileName}" -o "${baseName}.o"`, 
                        `ld.lld -m elf_x86_64_fbsd -e main "${baseName}.o" -o "${baseName}"`, 
                        `qemu-x86_64-static ./"${baseName}"`
                    ]; break;
                    case 14: commands = [
                        `aarch64-linux-gnu-as "${fileName}" -o "${baseName}.o"`, 
                        `aarch64-linux-gnu-ld "${baseName}.o" -o "${baseName}"`, 
                        `qemu-aarch64-static ./"${baseName}"`
                    ]; break;
                }
            } else {
                // أوامر لينكس المقسمة (باستخدام ld القياسي)
                switch (selectedIndex) {
                    case 1: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `ld "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
                    case 2: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `ld -e main "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
                    case 3: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `ld -m elf_i386 "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
                    case 4: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `ld -m elf_i386 -e main "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
                    case 5: commands = [`uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o"`, `i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 6: commands = [`nasm -f win32 "${fileName}" -o "${baseName}.obj"`, `i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 7: commands = [`nasm -f win64 "${fileName}" -o "${baseName}.obj"`, `x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 8: commands = [`uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o"`, `i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -Wl,-e_main`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 9: commands = [`nasm -f win32 "${fileName}" -o "${baseName}.obj"`, `i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-e_main`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 10: commands = [`nasm -f win64 "${fileName}" -o "${baseName}.obj"`, `x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-emain`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                    case 11: commands = [
                        `nasm -f macho64 "${fileName}" -o "${baseName}.o"`, 
                        `x86_64-apple-darwin20.4-ld "${baseName}.o" -o "${baseName}" -macosx_version_min 10.11 -lSystem -syslibroot /usr/local/SDK/MacOSX11.3.sdk`, 
                        `darling shell ./"${baseName}"`
                    ]; break;
                    case 12: commands = [
                        `nasm -f elf64 "${fileName}" -o "${baseName}.o"`, 
                        `ld.lld -m elf_x86_64_fbsd "${baseName}.o" -o "${baseName}"`, 
                        `qemu-x86_64-static ./"${baseName}"`
                    ]; break;
                    case 13: commands = [
                        `nasm -f elf64 "${fileName}" -o "${baseName}.o"`, 
                        `ld.lld -m elf_x86_64_fbsd -e main "${baseName}.o" -o "${baseName}"`, 
                        `qemu-x86_64-static ./"${baseName}"`
                    ]; break;
                    case 14: commands = [
                        `aarch64-linux-gnu-as "${fileName}" -o "${baseName}.o"`, 
                        `aarch64-linux-gnu-ld "${baseName}.o" -o "${baseName}"`, 
                        `qemu-aarch64-static ./"${baseName}"`
                    ]; break;
                }
            }
            // ----------------------------------------------------
        } else if (platform === 'win32') {
            options = [
                `✨ Auto Detect: ${autoDetected.name}`,
                "1) Win32 Irvine (Standard)",
                "2) Win32 Standalone (Standard)",
                "3) Win64 Standalone (Standard)",
                "4) Win32 Irvine (Custom main)",
                "5) Win32 Standalone (Custom main)",
                "6) Win64 Standalone (Custom main)"
            ];

            const selection = await vscode.window.showQuickPick(options, {
                placeHolder: `Choose build mode (Windows) | Irvine Path: ${currentIrvinePath}`
            });

            if (!selection) return;

            // تحديد الـ Index بناءً على اختيار المستخدم
            if (selection.startsWith('✨ Auto Detect')) {
                selectedIndex = autoDetected.index;
            } else {
                selectedIndex = parseInt(selection.split(')')[0]);
            }

            let irvinePath = "";

            if (selectedIndex === 1 || selectedIndex === 4) {
                const pathResult = await getIrvinePath(context);
                if (!pathResult) return;
                irvinePath = pathResult;
            }

            // --- الإضافة الجديدة: فحص واعتماد الطريقة الأنسب ---
            const linkerMethod = await detectBestWin32Linker(context);

            if (linkerMethod === 'ld') {
                // أوامر الويندوز المقسمة (ld) مباشر بدون cmd /c مع إضافة --enable-stdcall-fixup
                switch (selectedIndex) {
                    case 1: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -lkernel32 -luser32 --subsystem console --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
                    case 2: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
                    case 3: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw64\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 -L C:\\msys64\\mingw64\\lib`, `.\\${baseName}.exe`]; break;
                    case 4: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -lkernel32 -luser32 -e _main --subsystem console --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
                    case 5: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 -e _main --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
                    case 6: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw64\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 -e main -L C:\\msys64\\mingw64\\lib`, `.\\${baseName}.exe`]; break;
                }
            } else {
                // أوامر الويندوز المقسمة (gcc)
                switch (selectedIndex) {
                    case 1: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -w '-Wl,--subsystem,console'`, `.\\${baseName}.exe`]; break;
                    case 2: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `.\\${baseName}.exe`]; break;
                    case 3: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw64\\bin\\x86_64-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `.\\${baseName}.exe`]; break;
                    case 4: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -w '-Wl,-e_main' '-Wl,--subsystem,console' '-Wl,--enable-stdcall-fixup' 2>$null`, `.\\${baseName}.exe`]; break;
                    case 5: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 '-Wl,-e_main'`, `.\\${baseName}.exe`]; break;
                    case 6: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw64\\bin\\x86_64-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 '-Wl,-emain'`, `.\\${baseName}.exe`]; break;
                }
            }
            // ----------------------------------------------------
        }

        // --- الإضافة الجديدة: نظام بناء ذكي مع عرض كافة السجلات في الطرفية ---
        if (commands.length > 0) {
            const assembleCmd = commands[0];                          // الأمر الأول: المجمع (nasm/uasm/gas)
            const linkCmd = commands.length > 1 ? commands[1] : null; // الأمر الثاني: الرابط (ld/gcc)
            const runCommands = commands.length > 2 ? commands.slice(2) : []; // الأوامر المتبقية: التشغيل

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                title: "Building Assembly...",
            }, async () => {
                
                // تجهيز الطرفية أولاً لكي تظهر فيها الأوامر
                let terminal = vscode.window.activeTerminal;
                if (!terminal || terminal.name !== "ahmed_x86_asm") {
                    terminal = vscode.window.createTerminal("ahmed_x86_asm");
                }
                terminal.show(true); // true لعدم سحب التركيز من الكود
                terminal.sendText(`cd "${fileDir}"`);
                
                // تنظيف الطرفية
                terminal.sendText(platform === 'win32' ? 'cls' : 'clear');

                // 1. فحص الكود والتجميع في الخلفية (Linter)
                const isAssembleSuccess = await assembleAndDiagnose(assembleCmd, fileDir, editor.document);
                
                // إرسال أمر التجميع للطرفية ليراه المستخدم (Log)
                terminal.sendText(assembleCmd);

                if (!isAssembleSuccess) {
                    return; // توقف التنفيذ لوجود خطأ، والمستخدم سيرى اللوج في الطرفية
                }

                // 2. الربط (Linking) في الخلفية لاختبار نجاحه
                if (linkCmd) {
                    const isLinkSuccess = await new Promise<boolean>((resolve) => {
                        cp.exec(linkCmd, { cwd: fileDir }, (error, stdout, stderr) => {
                            if (error) {
                                let errorMsg = (stderr || stdout || error.message).trim();
                                if (errorMsg.length > 300) errorMsg = errorMsg.substring(0, 300) + '...';
                                vscode.window.showErrorMessage(`ahmed-x86 Linker Error: ${errorMsg} ❌`);
                                resolve(false);
                            } else {
                                resolve(true);
                            }
                        });
                    });
                    terminal.sendText(linkCmd);

                    if (!isLinkSuccess) {
                        return; 
                    }
                }
                for (const cmd of runCommands) {
                    terminal.sendText(cmd);
                }

                setTimeout(async () => {
                    await cleanUpTempFiles(fileDir, baseName);
                }, 1000); 

            });
        }
    });

    // --- الإضافة الجديدة (v1.1.8): قراءة ملف .err عند وقوف الماوس على الخطأ ---
    let hoverDisposable = vscode.languages.registerHoverProvider(
        [{ scheme: 'file', language: 'assembly' }, { scheme: 'file', pattern: '**/*.{asm,s,S,inc,nasm,masm,uasm}' }],
        {
            provideHover(document, position, token) {
                // التحقق مما إذا كان السطر الذي يقف عليه الماوس يحتوي على خطأ أحمر
                const diagnostics = diagnosticCollection.get(document.uri);
                const hasErrorOnLine = diagnostics?.some(d => d.range.contains(position));

                if (hasErrorOnLine) {
                    const filePath = document.fileName;
                    const parsedPath = path.parse(filePath);
                    const errFilePath = path.join(parsedPath.dir, parsedPath.name + '.err');

                    if (fs.existsSync(errFilePath)) {
                        try {
                            const errContent = fs.readFileSync(errFilePath, 'utf8').trim();
                            if (errContent) {
                                const markdown = new vscode.MarkdownString();
                                markdown.appendMarkdown(`**📄 Log File (${parsedPath.name}.err):**\n`);
                                markdown.appendCodeblock(errContent, 'log');
                                return new vscode.Hover(markdown);
                            }
                        } catch (e) {
                            // تجاهل الخطأ بصمت
                        }
                    }
                }
                return null;
            }
        }
    );

    // --- الإضافة الجديدة للتحديث 1.2.1: قائمة الإعدادات والأدوات المجمعة ---
    let showSettingsMenuDisposable = vscode.commands.registerCommand('ahmed-x86-asm.showSettingsMenu', async () => {
        const options = [
            { label: '$(settings-gear) Open Extension Settings', description: 'Configure extension features (e.g., auto-cleanup)', command: 'settings' },
            { label: '$(package) Check Dependencies', description: 'Verify required ASM tools and packages', command: 'ahmed-x86-asm.checkDeps' },
            { label: '$(folder-opened) Reset Irvine Path', description: 'Clear the saved Irvine32 directory path', command: 'ahmed-x86-asm.resetIrvinePath' },
            { label: '$(wrench) Set Win32 Linker Method', description: 'Choose between ld or gcc for Windows linking', command: 'ahmed-x86-asm.setLinkerMethod' },
            { label: '$(refresh) Reset Win32 Linker Method', description: 'Let the extension auto-detect the Windows linker', command: 'ahmed-x86-asm.resetLinkerMethod' },
            { label: '$(wrench) Set Linux Linker Method', description: 'Choose between ld or gcc for Linux linking', command: 'ahmed-x86-asm.setLinuxLinkerMethod' },
            { label: '$(refresh) Reset Linux Linker Method', description: 'Restore the default Linux linker (ld)', command: 'ahmed-x86-asm.resetLinuxLinkerMethod' }
        ];

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: 'ahmed-x86 ASM: Tools & Settings ⚙️'
        });

        if (selection) {
            if (selection.command === 'settings') {
                // فتح إعدادات الإضافة مباشرة في محرر VS Code
                vscode.commands.executeCommand('workbench.action.openSettings', 'ahmed-x86-asm');
            } else {
                // تشغيل الأمر الذي تم اختياره من القائمة
                vscode.commands.executeCommand(selection.command);
            }
        }
    });

    // تسجيل الأوامر معاً
    context.subscriptions.push(checkDepsDisposable);
    context.subscriptions.push(resetPathDisposable);
    context.subscriptions.push(resetLinkerDisposable); 
    context.subscriptions.push(setLinkerDisposable);   
    context.subscriptions.push(resetLinuxLinkerDisposable); 
    context.subscriptions.push(setLinuxLinkerDisposable);   
    context.subscriptions.push(runDisposable);
    context.subscriptions.push(hoverDisposable); 
    context.subscriptions.push(showSettingsMenuDisposable); // <--- تم تسجيل الأمر الجديد هنا
}

export function deactivate() {}
