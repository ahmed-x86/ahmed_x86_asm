import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// 1. دالة لتنفيذ أوامر الطرفية وجلب السطر الأول (تُستخدم في فحص الحزم)
export async function runCmd(cmd: string): Promise<{ success: boolean, output: string }> {
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

// 2. دالة مساعدة للحصول على مسار مكتبة Irvine وحفظه (تُستخدم في ويندوز ولينكس للـ Wine)
export async function getIrvinePath(context: vscode.ExtensionContext): Promise<string | undefined> {
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

// 3. دالة لتنظيف الملفات المؤقتة بعد التجميع
export async function cleanUpTempFiles(fileDir: string, baseName: string) {
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

// ==========================================
// 4. الدالة الجديدة: تسجيل المقتطفات (Snippets) بذكاء
// ==========================================
export function registerOSSpecificSnippets(context: vscode.ExtensionContext, currentPlatform: string) {
    let snippetFiles: string[] = [];

    // تحديد الملفات المسموح بها حسب نظام التشغيل
    if (currentPlatform === 'win32') {
        snippetFiles = ['windows.json'];
    } else if (currentPlatform === 'darwin') {
        snippetFiles = ['mac.json'];
    } else {
        // لينكس يشوف كل الملفات
        snippetFiles = [
            'linux.json', 
            'windows.json', 
            'mac.json', 
            'freebsd.json', 
            'arm.json', 
            'riscv.json'
        ];
    }

    // جميع اللغات التي ندعمها
    const supportedLangs = ['assembly', 'asm', 'nasm', 'masm', 'uasm', 'fasm', 'arm', 'mips', 'riscv', 'gas', 'MASM', 'NASM', 'FASM', 'UASM', 'ARM', 'MIPS'];

    // قراءة الملفات وتحويلها إلى مقتطفات برمجية (Autocomplete)
    snippetFiles.forEach(fileName => {
        const filePath = path.join(context.extensionPath, 'snippets', fileName);
        
        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const snippetsData = JSON.parse(fileContent);

                const provider = vscode.languages.registerCompletionItemProvider(supportedLangs, {
                    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                        const completionItems: vscode.CompletionItem[] = [];

                        for (const snippetName in snippetsData) {
                            const snippet = snippetsData[snippetName];
                            
                            // إنشاء العنصر الذي يظهر في القائمة المنسدلة
                            const item = new vscode.CompletionItem(snippetName, vscode.CompletionItemKind.Snippet);
                            
                            // دمج مصفوفة الكود إلى نص واحد إذا كانت مصفوفة
                            const snippetBody = Array.isArray(snippet.body) ? snippet.body.join('\n') : snippet.body;
                            item.insertText = new vscode.SnippetString(snippetBody);
                            
                            // إضافة الوصف والاختصار (Prefix) للبحث
                            item.detail = snippet.description || `Snippet from ${fileName}`;
                            item.filterText = Array.isArray(snippet.prefix) ? snippet.prefix.join(' ') : snippet.prefix;

                            completionItems.push(item);
                        }

                        return completionItems;
                    }
                });

                // تسجيل الـ Provider ليقوم VS Code بمسحه عند إيقاف الإضافة
                context.subscriptions.push(provider);
            } catch (err) {
                console.error(`ahmed-x86 ASM: Failed to load snippet file ${fileName}`, err);
            }
        }
    });
}
