# Graph Report - Sidecue-AI-Meeting-Interview-Copilot-Chrome-Web-Store  (2026-08-10)

## Corpus Check
- 19 files · ~50,728 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4535 nodes · 9328 edges · 306 communities (89 shown, 217 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 365 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `12ec1930`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pdf.worker.min.js
- f
- ConfigNamespace
- pdf.min.js
- TemplateNamespace
- CanvasGraphics
- .push
- supabase.min.js
- .i
- .onSymbolDictionary
- AnnotationEditorUIManager
- PartialEvaluator
- executeOpTree
- WidgetAnnotation
- AnnotationEditor
- .add
- FreeTextEditor
- has
- CFFCompiler
- XFAObject
- InkEditor
- .createElement
- .resolve
- .get
- Word64
- AnnotationEditorLayer
- Page
- constructor
- checkAndRepair
- handleOperation
- host_permissions
- .createDocumentHandler
- log
- PopupElement
- .decryptBlock
- .toString
- .remove
- PDFDocumentProxy
- constructor
- Annotation
- compileCharString
- SideCueApp
- PDFPageProxy
- WorkerTransport
- valueToHtml
- CanvasExtraState
- unsubscribe
- PDFNetworkStreamFullRequestReader
- ExpressionBuilderVisitor
- LocaleSetNamespace
- .a
- .ensureBuffer
- offscreen.js
- BaseFullReader
- PDFWorker
- XFAParser
- .parseXml
- _debug
- t
- PDFFetchStreamReader
- BasePdfManager
- .getObj
- Subform
- ariaLabel
- .getBytes
- .success
- .#r
- _bindElement
- ChunkedStream
- parseCMap
- XmlObject
- SessionManager
- background.js
- bind
- .getPattern
- process
- CMap
- FileTextExtractor
- fetchData
- PDFDataRangeTransport
- .reset
- Parser
- Glyph
- ConnectionSetNamespace
- xfaFactory
- .[r.$toHTML]
- Area
- BaseStream
- .getByte
- CalRGBCS
- compileGlyf
- createPacket
- .setupMessageHandler
- .[r.$pushGlyphs]
- IdentityCMap
- encode
- .delete
- Caption
- Stream
- NullOptimizer
- manifest.json
- LinkAnnotationElement
- parseCodestream
- ExclGroup
- FontInfo
- XFAObjectArray
- KnowledgeSync
- SimpleDOMNode
- PostScriptStack
- content-overlay.js
- LLMClient
- BaseCanvasFactory
- CommandManager
- Color
- GlobalImageCache
- .parse
- PDFWorkerStreamReader
- TextState
- XFAAttribute
- rr
- commands
- permissions
- .renderFileItem
- AnnotationBorderStyle
- PageArea
- Text
- DeepgramProvider
- BaseFilterFactory
- AES128Cipher
- CalGrayCS
- CFFIndex
- CompiledFont
- DeviceCmykCS
- parseChunks
- transform
- STTManager
- PCMDownsamplerProcessor
- RenderTask
- accept
- Br
- DeviceGrayCS
- DeviceRgbCS
- ExData
- FontSelector
- Jbig2Stream
- Ref
- TagTree
- Template
- Value
- WorkerTask
- default_icon
- PDFDocumentLoadingTask
- PrintAnnotationStorage
- AlternateCS
- ContentObject
- DatasetsNamespace
- DecodingContext
- IntegerObject
- OptionObject
- Root
- Ui
- icons
- DOMCanvasFactory
- XfaText
- AstNode
- BaseShading
- BehaviorOverride
- Body
- Cmd
- Data
- Datasets
- DefaultAppearanceEvaluator
- Empty
- Exclude
- Fill
- Name
- NullCipher
- Packets
- PageRange
- Pattern
- PatternCS
- Range
- Record
- Relevant
- Rename
- SignatureNamespace
- SignatureWidgetAnnotation
- StylesheetNamespace
- SubjectDN
- UnknownNamespace
- ValidateApprovalSignatures
- Window
- Xdp
- XdpNamespace
- supabase-client.js
- rules/graphify.md
- workflows/graphify.md
- Acrobat
- AddSilentPrint
- AdjustData
- AdobeExtensionLevel
- Agent
- Amd
- Attributes
- cancelAllRequests
- CaretAnnotation
- .constructor
- CFFCharset
- CFFEncoding
- Compress
- Compression
- .log
- fingerprints
- Conformance
- Contour
- Creator
- CurrencySymbol
- CurrencySymbols
- DatePattern
- DateTimeSymbols
- DayNames
- Debug
- Destination
- Driver
- DummyShading
- DuplexOption
- Embed
- EOIMarkerError
- Equate
- EquateRange
- Era
- EraNames
- EvalState
- ExcludeNS
- FileAttachmentAnnotation
- FlipLabel
- FormFieldFilling
- GroupParent
- HuffmanLine
- IfEmpty
- IncludeXDPContent
- IncrementalLoad
- IncrementalMerge
- Interactive
- Jbig2Error
- JpxError
- Layout
- Li
- Log
- NameAttr
- NumberOfCopies
- Ol
- OpenAction
- Output
- OutputBin
- OutputXSL
- PageOffset
- PaginationOverride
- ParserEOFException
- Pdf
- Pdfa
- PlaintextMetadata
- PolygonAnnotation
- presence
- PrinterName
- RadialAxialShading
- RenderPolicy
- ReversibleTransform
- SilentPrint
- Span
- Sub
- SubmitUrl
- Sup
- Tagged
- TemplateCache
- TypeFaces
- Ul
- VersionControl
- Xdc
- XRefEntryException
- Xsl
- Zpl
- Jog
- NumberPattern
- Pagination
- PickTrayByPDFSize
- Producer
- ScriptModel
- StartNode
- StringObject
- Threshold
- TimePattern
- To
- version
- Whitespace
- PaginationOverride
- RadialAxialShading
- Sup
- TypeFaces

## God Nodes (most connected - your core abstractions)
1. `ConfigNamespace` - 141 edges
2. `f()` - 126 edges
3. `SideCueApp` - 120 edges
4. `TemplateNamespace` - 115 edges
5. `CanvasGraphics` - 95 edges
6. `PopupElement` - 91 edges
7. `XFAParser` - 85 edges
8. `AnnotationEditorUIManager` - 80 edges
9. `AnnotationEditor` - 77 edges
10. `t()` - 68 edges

## Surprising Connections (you probably didn't know these)
- `getFullReader()` --indirect_call--> `t()`  [INFERRED]
  lib/pdf.min.js → lib/supabase.min.js
- `serializable()` --indirect_call--> `t()`  [INFERRED]
  lib/pdf.worker.min.js → lib/supabase.min.js
- `clear()` --indirect_call--> `t()`  [INFERRED]
  lib/pdf.min.js → lib/supabase.min.js
- `composeSMask()` --indirect_call--> `f()`  [INFERRED]
  lib/pdf.min.js → lib/supabase.min.js
- `constructor()` --indirect_call--> `g()`  [INFERRED]
  lib/pdf.worker.min.js → lib/supabase.min.js

## Import Cycles
- None detected.

## Communities (306 total, 217 thin omitted)

### Community 0 - "pdf.worker.min.js"
Cohesion: 0.01
Nodes (141): abort(), Acrobat7, ADBE_JSConsole, ADBE_JSDebugger, AddSilentPrint, addState(), AdjustData, Amd (+133 more)

### Community 1 - "f"
Cohesion: 0.01
Nodes (75): AppearanceFilter, Assist, Barcode, Bookend, Break, BreakAfter, BreakBefore, Calculate (+67 more)

### Community 3 - "pdf.min.js"
Cohesion: 0.03
Nodes (61): addNativeFontFace(), BaseException(), BaseShadingPattern, bind(), bytesToString(), CMYK_HTML(), CMYK_RGB(), convertOpList() (+53 more)

### Community 5 - "CanvasGraphics"
Cohesion: 0.05
Nodes (17): applyBoundingBox(), applyTransform(), CanvasGraphics, clip(), copyCtxState(), drawImageAtIntegerCoords(), getAxialAlignedBoundingBox(), getImageSmoothingEnabled() (+9 more)

### Community 6 - ".push"
Cohesion: 0.07
Nodes (28): addChildren(), AppearanceStreamEvaluator, buildHuffmanTable(), fetchIfRefAsync(), getBaseStreams(), getBeginChunk(), getEndChunk(), getInheritableProperty() (+20 more)

### Community 7 - "supabase.min.js"
Cohesion: 0.02
Nodes (53): ar(), At(), channel(), cloneRequestState(), createNamespace(), createNamespaceIfNotExists(), _createOAuthClient(), createTable() (+45 more)

### Community 8 - ".i"
Cohesion: 0.09
Nodes (73): _acquireLock(), _approveAuthorization(), _authenticate(), _autoRefreshTokenTick(), _callRefreshToken(), _challengeAndVerify(), _debug(), _denyAuthorization() (+65 more)

### Community 9 - ".onSymbolDictionary"
Cohesion: 0.06
Nodes (21): BitModel, byteIn(), ContextCache, copyCoefficients(), decodeBitmap(), decodeIAID(), decodeInteger(), decodeMMRBitmap() (+13 more)

### Community 11 - "PartialEvaluator"
Cohesion: 0.07
Nodes (6): BaseLocalCache, incrementCachedImageMaskCount(), normalizeBlendMode(), OperatorList, parseShading(), PartialEvaluator

### Community 12 - "executeOpTree"
Cohesion: 0.08
Nodes (35): addFontStyle(), beginText(), closeEOFillStroke(), closeFillStroke(), closePath(), closeStroke(), endPath(), endText() (+27 more)

### Community 13 - "WidgetAnnotation"
Cohesion: 0.15
Nodes (6): charsToGlyphs(), ChoiceWidgetAnnotation, encodeString(), getCharPositions(), TextWidgetAnnotation, WidgetAnnotation

### Community 15 - ".add"
Cohesion: 0.04
Nodes (17): AnnotationElement, CaretAnnotationElement, CircleAnnotationElement, FileAttachmentAnnotationElement, FreeTextAnnotationElement, getRectDims(), HighlightAnnotationElement, InkAnnotationElement (+9 more)

### Community 17 - "has"
Cohesion: 0.06
Nodes (8): adjustMapping(), Catalog, fetchAsync(), fetchDestination(), _getLinearizationPage(), has(), loadXfaFonts(), NameOrNumberTree

### Community 18 - "CFFCompiler"
Cohesion: 0.05
Nodes (14): add(), addPdfFont(), CFFCompiler, CFFDict, CFFOffsetTracker, CFFPrivateDict, CFFStrings, CFFTopDict (+6 more)

### Community 21 - ".createElement"
Cohesion: 0.08
Nodes (8): AnnotationStorage, CheckboxWidgetAnnotationElement, ChoiceWidgetAnnotationElement, LoopbackPort, PushButtonWidgetAnnotationElement, RadioButtonWidgetAnnotationElement, TextWidgetAnnotationElement, WidgetAnnotationElement

### Community 22 - ".resolve"
Cohesion: 0.16
Nodes (10): constructor(), #de(), _onProgressiveDone(), _onReceiveData(), PDFDataTransportStreamRangeReader, PDFObjects, #pe(), sendWithStream() (+2 more)

### Community 23 - ".get"
Cohesion: 0.07
Nodes (10): ButtonWidgetAnnotation, _cache(), ColorSpace, create(), createFromArray(), fetchIfRef(), getCached(), parseCff() (+2 more)

### Community 24 - "Word64"
Cohesion: 0.08
Nodes (12): ch(), decodeAndClamp(), ImageResizer, littleSigma(), littleSigmaPrime(), maj(), PDFImage, resizeImageMask() (+4 more)

### Community 26 - "Page"
Cohesion: 0.09
Nodes (6): applyTransform(), getAxialAlignedBoundingBox(), getTransformMatrix(), load(), loadXfaImages(), Page

### Community 27 - "constructor"
Cohesion: 0.14
Nodes (11): decrypt(), extractFontHeader(), extractFontProgram(), getToken(), isSpecial(), PostScriptToken, prevChar(), readBoolean() (+3 more)

### Community 28 - "checkAndRepair"
Cohesion: 0.13
Nodes (16): amend(), amendFallbackToUnicode(), applyStandardFontGlyphMap(), buildToFontChar(), convert(), createCmapTable(), createOS2Table(), createPostTable() (+8 more)

### Community 29 - "handleOperation"
Cohesion: 0.06
Nodes (29): #a(), addNode(), addTopLevelNode(), decodeScan(), FakeUnicodeFont, fieldObjects(), findNextFileMarker(), formInfo() (+21 more)

### Community 30 - "host_permissions"
Cohesion: 0.05
Nodes (41): host_permissions, https://*.8x8.vc/*, https://app.chime.aws/*, https://app.gather.town/*, https://app.slack.com/*, https://*.around.co/*, https://*.bluejeans.com/*, https://*.butter.us/* (+33 more)

### Community 31 - ".createDocumentHandler"
Cohesion: 0.08
Nodes (14): checkFirstPage(), checkLastPage(), clean(), ensure(), forEach(), getNewTemporaryRef(), getPage(), _getPageIndex() (+6 more)

### Community 32 - "log"
Cohesion: 0.09
Nodes (39): _appendParams(), _clearAllTimers(), _clearTimer(), connect(), connectionState(), disconnect(), endpointURL(), flushSendBuffer() (+31 more)

### Community 33 - "PopupElement"
Cohesion: 0.12
Nodes (25): _addToPushBuffer(), _cancelRefEvent(), _cancelTimeout(), _canPush(), destroy(), finally(), _getPayloadRecords(), _hasReceived() (+17 more)

### Community 34 - ".decryptBlock"
Cohesion: 0.10
Nodes (6): AESBaseCipher, ARCFourCipher, calculateSHA384(), CipherTransformFactory, PDF17, PDF20

### Community 35 - ".toString"
Cohesion: 0.10
Nodes (8): calculationOrderIds(), _collectJS(), fetch(), fetchCompressed(), fetchUncompressed(), RefSet, RefSetCache, StructElementNode

### Community 38 - "constructor"
Cohesion: 0.08
Nodes (34): I, catch(), cloneDeep(), constructor(), execute(), getPromise(), _initializeOptions(), _initRealtimeClient() (+26 more)

### Community 40 - "compileCharString"
Cohesion: 0.05
Nodes (20): composeSMask(), composeSMaskBackdrop(), Arc, CFFFDSelect, compileCharString(), CompiledFont, getSubroutineBias(), hasMargin() (+12 more)

### Community 44 - "valueToHtml"
Cohesion: 0.07
Nodes (8): BooleanElement, DateElement, DateTime, Decimal, Float, Integer, Time, valueToHtml()

### Community 45 - "CanvasExtraState"
Cohesion: 0.18
Nodes (4): bezierBoundingBox(), CanvasExtraState, intersect(), scaleMinMax()

### Community 46 - "unsubscribe"
Cohesion: 0.18
Nodes (5): CompositeGlyph, getSize(), Glyph, scale(), write()

### Community 47 - "PDFNetworkStreamFullRequestReader"
Cohesion: 0.18
Nodes (4): createRequestOptions(), NetworkManager, PDFNodeStreamFullReader, PDFNodeStreamRangeReader

### Community 48 - "ExpressionBuilderVisitor"
Cohesion: 0.08
Nodes (7): AstArgument, AstBinaryOperation, AstLiteral, AstMin, AstVariable, AstVariableDefinition, ExpressionBuilderVisitor

### Community 50 - ".a"
Cohesion: 0.08
Nodes (17): deflateSyncUncompressed(), encode(), get(), getPathGenerator(), isDataScheme(), KeyboardManager, #ki(), #Mi() (+9 more)

### Community 51 - ".ensureBuffer"
Cohesion: 0.08
Nodes (7): Ascii85Stream, AsciiHexStream, CCITTFaxStream, JpxStream, LZWStream, PredictorStream, RunLengthStream

### Community 52 - "offscreen.js"
Cohesion: 0.18
Nodes (23): broadcast(), buildAudioGraph(), checkForQuestion(), detectAndGenerateCue(), geminiFileUris, getCueDelay(), getResponseLength(), getResponseStyle() (+15 more)

### Community 53 - "BaseFullReader"
Cohesion: 0.11
Nodes (5): BaseFullReader, BaseRangeReader, on(), PDFNodeStreamFsFullReader, PDFNodeStreamFsRangeReader

### Community 54 - "PDFWorker"
Cohesion: 0.13
Nodes (8): _fetchDocument(), getDataProp(), getDocument(), getUrlProp(), _initialize(), PDFWorker, send(), sendWithPromise()

### Community 56 - ".parseXml"
Cohesion: 0.14
Nodes (4): isWhitespace(), onText(), parseFromString(), XMLParserBase

### Community 58 - "t"
Cohesion: 0.08
Nodes (40): ce(), copy(), createBucket(), createIndex(), createSignedUploadUrl(), createSignedUrl(), createSignedUrls(), deleteBucket() (+32 more)

### Community 60 - "PDFFetchStreamReader"
Cohesion: 0.06
Nodes (13): BaseCMapReaderFactory, BaseStandardFontDataFactory, createFetchOptions(), createHeaders(), DOMCMapReaderFactory, DOMStandardFontDataFactory, fetchData(), getArrayBuffer() (+5 more)

### Community 62 - ".getObj"
Cohesion: 0.22
Nodes (5): Lexer, nextChar(), toHexDigit(), xfaData(), xfaDatasets()

### Community 64 - "ariaLabel"
Cohesion: 0.15
Nodes (7): ariaLabel(), CheckButton, ChoiceList, DateTimeEdit, isRequired(), NumericEdit, TextEdit

### Community 65 - ".getBytes"
Cohesion: 0.16
Nodes (5): appendText(), BaseSVGFactory, getCtx(), layout(), TextLayerRenderTask

### Community 66 - ".success"
Cohesion: 0.12
Nodes (5): Button, ContentArea, Html, ImageEdit, Items

### Community 68 - "_bindElement"
Cohesion: 0.17
Nodes (13): bind(), _bindElement(), _bindItems(), _bindOccurrences(), _bindValue(), _createOccurrences(), createText(), _findDataByNameToConsume() (+5 more)

### Community 70 - "parseCMap"
Cohesion: 0.29
Nodes (14): expectInt(), expectString(), getUint32(), parseBfChar(), parseBfRange(), parseCidChar(), parseCidRange(), parseCMap() (+6 more)

### Community 73 - "background.js"
Cohesion: 0.24
Nodes (16): broadcastToAll(), broadcastToRuntime(), cleanupOverlayListeners(), clearCaptureState(), DEFAULT_DEEPGRAM_KEY, DEFAULT_OPENROUTER_KEY, ensureOffscreenDocument(), injectOverlay() (+8 more)

### Community 75 - ".getPattern"
Cohesion: 0.17
Nodes (5): CachedCanvases, drawFigure(), drawTriangle(), MeshShadingPattern, RadialAxialShadingPattern

### Community 76 - "process"
Cohesion: 0.23
Nodes (7): addHex(), BinaryCMapStream, hexToInt(), hexToStr(), incHex(), process(), readNumber()

### Community 80 - "fetchData"
Cohesion: 0.11
Nodes (18): 🎯 1. Real-Time Meeting & Interview Cues, 📝 2. Crisp Live Transcription & Speaker Recognition, 📂 3. Knowledge Base Grounding (Up to 10 Files), 🎙️ 4. Transcript Import (Audio & Text Files), 📄 5. Export Transcripts (PDF & TXT), 🎭 6. Custom System Prompts & Personas, 💡 7. Copilot Question Suggestions, AI-Take-Notes 🚀 (+10 more)

### Community 83 - "Parser"
Cohesion: 0.23
Nodes (3): FlateStream, JpegStream, readXRefStream()

### Community 84 - "Glyph"
Cohesion: 0.05
Nodes (28): addString(), Border, bytesToString(), charCodeOf(), compileGlyf(), createNameTable(), createPostscriptName(), DatasetXMLParser (+20 more)

### Community 88 - ".[r.$toHTML]"
Cohesion: 0.27
Nodes (8): applyAssist(), Draw, getBorderDims(), handleBreak(), handleOverflow(), setFirstUnsplittable(), setTabIndex(), unsetFirstUnsplittable()

### Community 91 - ".getByte"
Cohesion: 0.18
Nodes (5): DOMFilterFactory, getRGB(), makeHexColor(), setFillRGBColor(), setStrokeRGBColor()

### Community 94 - "createPacket"
Cohesion: 0.05
Nodes (36): ComponentPositionResolutionLayerIterator(), ConnectionSet, createPacket(), EffectiveInputPolicy, EffectiveOutputPolicy, getPrecinctIndexIfExist(), getPrecinctSizesInImageScale(), LayerResolutionComponentPositionIterator() (+28 more)

### Community 96 - ".setupMessageHandler"
Cohesion: 0.14
Nodes (3): Area, getContainedChildren(), SubformSet

### Community 97 - ".[r.$pushGlyphs]"
Cohesion: 0.20
Nodes (4): addPara(), B, P, popFont()

### Community 98 - "IdentityCMap"
Cohesion: 0.16
Nodes (3): createBuiltInCMap(), extendCMap(), IdentityCMap

### Community 99 - "encode"
Cohesion: 0.21
Nodes (12): _binaryDecode(), _binaryEncodeUserBroadcastPush(), decode(), _decodeUserBroadcast(), encode(), _encodeBinaryUserBroadcastPush(), _encodeJsonUserBroadcastPush(), _encodeUserBroadcastPush() (+4 more)

### Community 101 - "Caption"
Cohesion: 0.18
Nodes (3): Caption, Field, _setValue()

### Community 102 - "Stream"
Cohesion: 0.11
Nodes (4): checkHeader(), startXRef(), Stream, TimeSlotManager

### Community 104 - "manifest.json"
Cohesion: 0.18
Nodes (10): background, service_worker, description, manifest_version, name, side_panel, default_path, update_url (+2 more)

### Community 105 - "LinkAnnotationElement"
Cohesion: 0.13
Nodes (4): AnnotationElementFactory, getEditableAnnotation(), has(), LinkAnnotationElement

### Community 106 - "parseCodestream"
Cohesion: 0.20
Nodes (9): buildCodeblocks(), buildPackets(), buildPrecincts(), calculateComponentDimensions(), calculateTileGrids(), getBlocksDimensions(), initializeTile(), parseCodestream() (+1 more)

### Community 111 - "KnowledgeSync"
Cohesion: 0.18
Nodes (3): DecodeStream, DecryptStream, readBlock()

### Community 112 - "SimpleDOMNode"
Cohesion: 0.22
Nodes (3): _getSequence(), _parseArray(), SimpleDOMNode

### Community 118 - "Color"
Cohesion: 0.25
Nodes (3): Color, makeHexColor(), Stipple

### Community 124 - "rr"
Cohesion: 0.13
Nodes (18): buildAddOperation(), buildMinOperation(), buildMulOperation(), buildSubOperation(), constructor(), _createBuiltInEncoding(), #E(), findBlock() (+10 more)

### Community 125 - "commands"
Cohesion: 0.29
Nodes (8): commands, start-session, toggle-pause, description, suggested_key, default, description, suggested_key

### Community 126 - "permissions"
Cohesion: 0.25
Nodes (8): permissions, activeTab, identity, offscreen, scripting, sidePanel, storage, tabCapture

### Community 127 - ".renderFileItem"
Cohesion: 0.17
Nodes (14): constructPath(), _ensureClipGroup(), _ensureTransformGroup(), getObject(), paintImageMaskXObject(), paintImageXObject(), paintInlineImageXObject(), paintSolidColorImageMask() (+6 more)

### Community 139 - "parseChunks"
Cohesion: 0.20
Nodes (7): Jbig2Stream, parseChunks(), processSegment(), processSegments(), readRegionSegmentInformation(), readSegmentHeader(), readSegments()

### Community 144 - "accept"
Cohesion: 0.60
Nodes (5): accept(), expect(), nextToken(), parseBlock(), parseCondition()

### Community 156 - "default_icon"
Cohesion: 0.40
Nodes (5): action, default_icon, 128, 16, 48

### Community 166 - "Ui"
Cohesion: 0.32
Nodes (8): createUser(), _deleteFactor(), deleteUser(), getUserById(), inviteUserByEmail(), rr(), updateUserById(), Vt()

### Community 167 - "icons"
Cohesion: 0.50
Nodes (4): icons, 128, 16, 48

### Community 172 - "BehaviorOverride"
Cohesion: 0.67
Nodes (4): _addNamespacePrefix(), build(), _getNamespaceToUse(), _searchNamespace()

### Community 205 - "AdjustData"
Cohesion: 0.50
Nodes (9): _addPixels(), _addPixelsNeg(), _eatBits(), _findTableCode(), _getBlackCode(), _getTwoDimCode(), _getWhiteCode(), _lookBits() (+1 more)

### Community 216 - "Compression"
Cohesion: 0.15
Nodes (11): adjustWidths(), CFF, checkAndRepair(), getFontFileType(), getUint16(), int16(), isTrueTypeCollectionFile(), isWinNameRecord() (+3 more)

## Knowledge Gaps
- **92 isolated node(s):** `DEFAULT_DEEPGRAM_KEY`, `DEFAULT_OPENROUTER_KEY`, `PixelsPerInch`, `NodeFilterFactory`, `chromeStorageAdapter` (+87 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **217 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `createPacket` to `pdf.worker.min.js`, `pdf.min.js`, `Text`, `supabase.min.js`, `.i`, `AnnotationEditorUIManager`, `PartialEvaluator`, `parseChunks`, `has`, `.resolve`, `checkAndRepair`, `handleOperation`, `.createDocumentHandler`, `log`, `PopupElement`, `constructor`, `WorkerTransport`, `BehaviorOverride`, `.parseXml`, `.getBytes`, `bind`, `Glyph`, `xfaFactory`, `encode`, `.delete`, `rr`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `f()` connect `f` to `PageArea`, `Text`, `supabase.min.js`, `.onSymbolDictionary`, `has`, `CFFCompiler`, `ExData`, `.get`, `Value`, `compileCharString`, `valueToHtml`, `.bindEvents`, `Subform`, `ariaLabel`, `.success`, `_bindElement`, `.[r.$toHTML]`, `Area`, `.setupMessageHandler`, `Caption`, `Driver`, `ExclGroup`, `FontInfo`, `Color`, `rr`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `SideCueApp` connect `SideCueApp` to `._hideAuthMessages`, `Day`, `ColorSpace`, `.init`, `.listenToEngine`, `.bindEvents`, `._startSessionInner`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Are the 124 inferred relationships involving `f()` (e.g. with `composeSMask()` and `adjustMapping()`) actually correct?**
  _`f()` has 124 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DEFAULT_DEEPGRAM_KEY`, `DEFAULT_OPENROUTER_KEY`, `PixelsPerInch` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pdf.worker.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.008222804201515024 - nodes in this community are weakly interconnected._
- **Should `f` be split into smaller, more focused modules?**
  _Cohesion score 0.011834319526627219 - nodes in this community are weakly interconnected._