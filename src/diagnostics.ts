import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// متغير لحفظ الأخطاء وعرضها في المحرر
export let diagnosticCollection: vscode.DiagnosticCollection;

// تصميم الدائرة الحمراء بجانب رقم السطر
const errorGutterDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.parse(`data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Ccircle%20cx%3D%228%22%20cy%3D%228%22%20r%3D%224%22%20fill%3D%22%23e51400%22%2F%3E%3C%2Fsvg%3E`),
    gutterIconSize: '60%' // حجم الدائرة ليكون صغيراً ومناسباً
});

// دالة تهيئة نظام الأخطاء (تُستدعى مرة واحدة عند تفعيل الإضافة)
export function setupDiagnostics(context: vscode.ExtensionContext) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('ahmed_x86_asm');
    context.subscriptions.push(diagnosticCollection);

    // تسجيل ميزة الـ Hover لقراءة ملف الأخطاء (.err)
    let hoverDisposable = vscode.languages.registerHoverProvider(
        [{ scheme: 'file', language: 'assembly' }, { scheme: 'file', pattern: '**/*.{asm,s,S,inc,nasm,masm,uasm}' }],
        {
            provideHover(document, position, token) {
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
                            // تجاهل الخطأ في حالة فشل القراءة
                        }
                    }
                }
                return null;
            }
        }
    );
    context.subscriptions.push(hoverDisposable);
}

// دالة مساعدة لاستخراج الكلمة الخاطئة من الرسالة وتحديد مكانها بدقة
function getAccurateErrorRange(lineText: string, message: string, lineIndex: number): vscode.Range {
    let targetWord = "";
    
    // محاولة استخراج الكلمة بين علامات التنصيص (غالبًا مع NASM)
    const quoteMatch = message.match(/['`"]([^'`"]+)['`"]/);
    if (quoteMatch) {
        targetWord = quoteMatch[1];
    } 
    // محاولة استخراج الكلمة بعد النقطتين (غالبًا مع UASM)
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

    // كخيار بديل إذا فشل الاستخراج، نضع الخط تحت أول كلمة في السطر
    const trimmed = lineText.trimStart();
    const startChar = lineText.length - trimmed.length;
    const firstWordMatch = trimmed.match(/^\S+/);
    const endChar = firstWordMatch ? startChar + firstWordMatch[0].length : lineText.length;
    
    return new vscode.Range(lineIndex, startChar, lineIndex, endChar);
}

// دالة لتشغيل أمر التجميع في الخلفية وتحليل الأخطاء (Diagnostics)
export async function assembleAndDiagnose(assembleCmd: string, fileDir: string, document: vscode.TextDocument): Promise<boolean> {
    return new Promise((resolve) => {
        cp.exec(assembleCmd, { cwd: fileDir }, (error, stdout, stderr) => {
            const output = (stdout || '') + '\n' + (stderr || '');
            const diagnostics: vscode.Diagnostic[] = [];
            const errorRanges: vscode.Range[] = []; 

            // Regex لاصطياد أخطاء المجمعات المختلفة
            const nasmRegex = /^(?:[^:]+):(\d+):\s+(error|warning|fatal):\s+(.*)$/gm;
            const uasmRegex = /^(?:[^(]+)\((\d+)\)\s+:\s+(Error|Fatal|Warning)\s+(.*)$/gm;
            const gasRegex = /^(?:[^:]+):(\d+)(?::\d+)?:?\s+(Error|Warning|Fatal):\s+(.*)$/gmi;

            let match;

            // فحص أخطاء NASM
            while ((match = nasmRegex.exec(output)) !== null) {
                const line = parseInt(match[1], 10) - 1; 
                const severityStr = match[2].toLowerCase();
                const message = match[3];

                const severity = severityStr.includes('warning') ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error;
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

                const severity = severityStr.includes('warning') ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error;
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

                const severity = severityStr.includes('warning') ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error;
                const safeLine = Math.max(0, Math.min(line, document.lineCount - 1));
                const lineText = document.lineAt(safeLine).text;
                const range = getAccurateErrorRange(lineText, message, safeLine);
                
                diagnostics.push(new vscode.Diagnostic(range, `GAS: ${message}`, severity));
                errorRanges.push(range);
            }

            const editor = vscode.window.activeTextEditor;

            if (diagnostics.length > 0) {
                // عرض الأخطاء في المحرر
                diagnosticCollection.set(document.uri, diagnostics);
                
                // رسم الدوائر الحمراء
                if (editor && editor.document.uri.toString() === document.uri.toString()) {
                    editor.setDecorations(errorGutterDecoration, errorRanges);
                }

                vscode.window.showErrorMessage(`ahmed-x86 ASM: Found ${diagnostics.length} issue(s). Check the red squiggles in your code! ❌`);
                resolve(false); 
            } else {
                // مسح الأخطاء القديمة
                diagnosticCollection.clear();
                if (editor) {
                    editor.setDecorations(errorGutterDecoration, []);
                }
                resolve(true); 
            }
        });
    });
}
