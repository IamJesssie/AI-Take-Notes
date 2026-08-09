# Graph Report - Sidecue-AI-Meeting-Interview-Copilot-Chrome-Web-Store  (2026-07-22)

## Corpus Check
- 18 files · ~48,359 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4505 nodes · 9271 edges · 306 communities (86 shown, 220 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 362 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

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
- ColorSpace
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
- Day
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
- MapElement
- Meridiem
- MeridiemNames
- MonthNames
- NameAttr
- NumberOfCopies
- Ol
- OpenAction
- Output
- OutputBin
- OutputXSL
- Overprint
- PageOffset
- PaginationOverride
- ParserEOFException
- Part
- Pcl
- Pdf
- Pdfa
- Permissions
- PlaintextMetadata
- PolygonAnnotation
- presence
- PrinterName
- PrintHighQuality
- Ps
- RadialAxialShading
- RenderPolicy
- ReversibleTransform
- RunScripts
- SilentPrint
- Span
- Sub
- SubmitFormat
- SubmitUrl
- Sup
- Tagged
- TemplateCache
- Trace
- Type
- TypeFaces
- Ul
- ValidationMessaging
- VersionControl
- ViewerPreferences
- Xdc
- XRefEntryException
- XRefParseException
- Xsl
- Zpl

## God Nodes (most connected - your core abstractions)
1. `ConfigNamespace` - 141 edges
2. `f()` - 126 edges
3. `TemplateNamespace` - 115 edges
4. `SideCueApp` - 111 edges
5. `CanvasGraphics` - 95 edges
6. `PopupElement` - 91 edges
7. `XFAParser` - 85 edges
8. `AnnotationEditorUIManager` - 80 edges
9. `AnnotationEditor` - 77 edges
10. `t()` - 68 edges

## Surprising Connections (you probably didn't know these)
- `clear()` --indirect_call--> `t()`  [INFERRED]
  lib/pdf.min.js → lib/supabase.min.js
- `composeSMask()` --indirect_call--> `f()`  [INFERRED]
  lib/pdf.min.js → lib/supabase.min.js
- `composeSMask()` --indirect_call--> `g()`  [INFERRED]
  lib/pdf.min.js → lib/supabase.min.js
- `getFullReader()` --indirect_call--> `t()`  [INFERRED]
  lib/pdf.min.js → lib/supabase.min.js
- `constructor()` --indirect_call--> `g()`  [INFERRED]
  lib/pdf.worker.min.js → lib/supabase.min.js

## Import Cycles
- None detected.

## Communities (306 total, 220 thin omitted)

### Community 0 - "pdf.worker.min.js"
Cohesion: 0.01
Nodes (134): abort(), Acrobat7, ADBE_JSConsole, ADBE_JSDebugger, _addNamespacePrefix(), addPdfFont(), addState(), AddViewerPreferences (+126 more)

### Community 1 - "f"
Cohesion: 0.01
Nodes (77): AppearanceFilter, Arc, Assist, Bookend, Break, BreakAfter, BreakBefore, Calculate (+69 more)

### Community 3 - "pdf.min.js"
Cohesion: 0.02
Nodes (67): AnnotationElementFactory, BaseException(), BaseShadingPattern, bytesToString(), CaretAnnotationElement, CheckboxWidgetAnnotationElement, ChoiceWidgetAnnotationElement, CMYK_HTML() (+59 more)

### Community 5 - "CanvasGraphics"
Cohesion: 0.04
Nodes (17): CanvasGraphics, copyCtxState(), drawImageAtIntegerCoords(), eoFill(), fill(), getAxialAlignedBoundingBox(), getImageSmoothingEnabled(), group() (+9 more)

### Community 6 - ".push"
Cohesion: 0.04
Nodes (56): add(), addChildren(), addNode(), addTopLevelNode(), adjustMapping(), AppearanceStreamEvaluator, buildHuffmanTable(), charCodeOf() (+48 more)

### Community 7 - "supabase.min.js"
Cohesion: 0.03
Nodes (37): ar(), channel(), cloneRequestState(), createNamespace(), createNamespaceIfNotExists(), createTable(), createTableIfNotExists(), createWebSocket() (+29 more)

### Community 8 - ".i"
Cohesion: 0.05
Nodes (77): ConnectionSet, EffectiveInputPolicy, EffectiveOutputPolicy, Operation, RootElement, SoapAction, SoapAddress, Stylesheet (+69 more)

### Community 9 - ".onSymbolDictionary"
Cohesion: 0.06
Nodes (21): BitModel, byteIn(), ContextCache, copyCoefficients(), decodeBitmap(), decodeIAID(), decodeInteger(), decodeMMRBitmap() (+13 more)

### Community 11 - "PartialEvaluator"
Cohesion: 0.07
Nodes (7): BaseLocalCache, getTransformMatrix(), normalizeRect(), OperatorList, parseShading(), PartialEvaluator, TranslatedFont

### Community 12 - "executeOpTree"
Cohesion: 0.06
Nodes (49): addFontStyle(), beginText(), clip(), closeEOFillStroke(), closeFillStroke(), closePath(), closeStroke(), constructPath() (+41 more)

### Community 13 - "WidgetAnnotation"
Cohesion: 0.06
Nodes (10): addString(), ButtonWidgetAnnotation, charsToGlyphs(), ChoiceWidgetAnnotation, Dict, documentInfo(), encodeString(), getCharPositions() (+2 more)

### Community 15 - ".add"
Cohesion: 0.06
Nodes (9): AnnotationElement, CircleAnnotationElement, FileAttachmentAnnotationElement, getRectDims(), InkAnnotationElement, LineAnnotationElement, PolylineAnnotationElement, PopupAnnotationElement (+1 more)

### Community 17 - "has"
Cohesion: 0.07
Nodes (8): Catalog, _collectJS(), fetchAsync(), fetchDestination(), getInheritableProperty(), _getLinearizationPage(), has(), NameOrNumberTree

### Community 18 - "CFFCompiler"
Cohesion: 0.07
Nodes (9): CFFCompiler, CFFDict, CFFOffsetTracker, CFFPrivateDict, CFFStrings, CFFTopDict, createDict(), emptyPrivateDictionary() (+1 more)

### Community 21 - ".createElement"
Cohesion: 0.09
Nodes (5): AnnotationStorage, BaseSVGFactory, setupStorage(), TextWidgetAnnotationElement, WidgetAnnotationElement

### Community 22 - ".resolve"
Cohesion: 0.06
Nodes (14): constructor(), #de(), _onProgressiveDone(), _onReceiveData(), OptionalContentGroup, PDFDataTransportStreamRangeReader, PDFDataTransportStreamReader, PDFNetworkStreamRangeRequestReader (+6 more)

### Community 23 - ".get"
Cohesion: 0.11
Nodes (17): #a(), _cache(), create(), createFromArray(), fetchIfRef(), fieldObjects(), formInfo(), getCached() (+9 more)

### Community 24 - "Word64"
Cohesion: 0.08
Nodes (12): ch(), decodeAndClamp(), ImageResizer, littleSigma(), littleSigmaPrime(), maj(), PDFImage, resizeImageMask() (+4 more)

### Community 26 - "Page"
Cohesion: 0.07
Nodes (7): FreeTextAnnotation, generateImages(), InkAnnotation, Page, printNewAnnotations(), saveNewAnnotations(), StampAnnotation

### Community 27 - "constructor"
Cohesion: 0.08
Nodes (33): _addPixels(), _addPixelsNeg(), constructor(), _createBuiltInEncoding(), decrypt(), #E(), _eatBits(), extractFontHeader() (+25 more)

### Community 28 - "checkAndRepair"
Cohesion: 0.06
Nodes (33): adjustWidths(), amend(), amendFallbackToUnicode(), applyStandardFontGlyphMap(), buildAddOperation(), buildMinOperation(), buildMulOperation(), buildSubOperation() (+25 more)

### Community 29 - "handleOperation"
Cohesion: 0.07
Nodes (41): ce(), copy(), createBucket(), createIndex(), createSignedUploadUrl(), createSignedUrl(), createSignedUrls(), deleteBucket() (+33 more)

### Community 30 - "host_permissions"
Cohesion: 0.05
Nodes (41): host_permissions, https://*.8x8.vc/*, https://app.chime.aws/*, https://app.gather.town/*, https://app.slack.com/*, https://*.around.co/*, https://*.bluejeans.com/*, https://*.butter.us/* (+33 more)

### Community 31 - ".createDocumentHandler"
Cohesion: 0.09
Nodes (15): annotationGlobals(), checkFirstPage(), checkLastPage(), createGlobals(), ensure(), fetch(), fetchIfRefAsync(), fetchUncompressed() (+7 more)

### Community 32 - "log"
Cohesion: 0.09
Nodes (38): _addToPushBuffer(), _appendParams(), _clearAllTimers(), _clearTimer(), connect(), connectionState(), endpointURL(), flushSendBuffer() (+30 more)

### Community 33 - "PopupElement"
Cohesion: 0.09
Nodes (13): appendText(), get(), getCtx(), getPathGenerator(), has(), #ki(), layout(), normalizeRect() (+5 more)

### Community 34 - ".decryptBlock"
Cohesion: 0.08
Nodes (7): AESBaseCipher, ARCFourCipher, calculateSHA384(), CipherTransform, CipherTransformFactory, PDF17, PDF20

### Community 35 - ".toString"
Cohesion: 0.07
Nodes (6): calculationOrderIds(), EvaluatorPreprocessor, hexdigest(), RefSet, RefSetCache, StructElementNode

### Community 38 - "constructor"
Cohesion: 0.08
Nodes (34): I, catch(), cloneDeep(), constructor(), execute(), getPromise(), _initRealtimeClient(), _initSupabaseAuthClient() (+26 more)

### Community 40 - "compileCharString"
Cohesion: 0.08
Nodes (12): composeSMask(), composeSMaskBackdrop(), CFFFDSelect, compileCharString(), getSubroutineBias(), Type1CharString, Type2Compiled, XhtmlNamespace (+4 more)

### Community 44 - "valueToHtml"
Cohesion: 0.07
Nodes (8): BooleanElement, DateElement, DateTime, Decimal, Float, Integer, Time, valueToHtml()

### Community 45 - "CanvasExtraState"
Cohesion: 0.11
Nodes (7): applyInverseTransform(), applyTransform(), bezierBoundingBox(), CanvasExtraState, intersect(), PageViewport, scaleMinMax()

### Community 46 - "unsubscribe"
Cohesion: 0.10
Nodes (27): _cancelRefEvent(), _cancelTimeout(), _canPush(), destroy(), disconnect(), _fetchWithTimeout(), finally(), _getPayloadRecords() (+19 more)

### Community 47 - "PDFNetworkStreamFullRequestReader"
Cohesion: 0.09
Nodes (5): createRequestOptions(), NetworkManager, PDFNetworkStreamFullRequestReader, PDFNodeStreamFullReader, PDFNodeStreamRangeReader

### Community 48 - "ExpressionBuilderVisitor"
Cohesion: 0.08
Nodes (7): AstArgument, AstBinaryOperation, AstLiteral, AstMin, AstVariable, AstVariableDefinition, ExpressionBuilderVisitor

### Community 50 - ".a"
Cohesion: 0.13
Nodes (8): ColorManager, DOMFilterFactory, getRGB(), makeHexColor(), setFillRGBColor(), setStrokeRGBColor(), getKeyword(), rpc()

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
Cohesion: 0.11
Nodes (9): _fetchDocument(), getDataProp(), getDocument(), getUrlProp(), _initialize(), LoopbackPort, PDFWorker, send() (+1 more)

### Community 55 - "XFAParser"
Cohesion: 0.11
Nodes (12): Barcode, Border, getMeasurement(), onBeginElement(), parseExpression(), _parseHasJSActions(), parseHeader(), Submit (+4 more)

### Community 56 - ".parseXml"
Cohesion: 0.15
Nodes (3): isWhitespace(), onText(), XMLParserBase

### Community 57 - "_debug"
Cohesion: 0.19
Nodes (20): _autoRefreshTokenTick(), _callRefreshToken(), _debug(), _emitInitialSession(), _handleProviderSignIn(), _handleVisibilityChange(), initialize(), _isImplicitGrantCallback() (+12 more)

### Community 58 - "t"
Cohesion: 0.12
Nodes (19): getFullReader(), serializable(), At(), br(), _challenge(), createNewAbortSignal(), generateLink(), getIndex() (+11 more)

### Community 60 - "PDFFetchStreamReader"
Cohesion: 0.12
Nodes (5): BaseStandardFontDataFactory, createFetchOptions(), createHeaders(), PDFFetchStreamRangeReader, PDFFetchStreamReader

### Community 62 - ".getObj"
Cohesion: 0.22
Nodes (8): getNumber(), Lexer, nextChar(), processXRefTable(), readXRefTable(), toHexDigit(), xfaData(), xfaDatasets()

### Community 63 - "Subform"
Cohesion: 0.12
Nodes (3): getContainedChildren(), Subform, SubformSet

### Community 64 - "ariaLabel"
Cohesion: 0.15
Nodes (7): ariaLabel(), CheckButton, ChoiceList, DateTimeEdit, isRequired(), NumericEdit, TextEdit

### Community 65 - ".getBytes"
Cohesion: 0.12
Nodes (4): DecodeStream, DecryptStream, IndexedCS, readBlock()

### Community 66 - ".success"
Cohesion: 0.12
Nodes (5): Button, ContentArea, Html, ImageEdit, Items

### Community 68 - "_bindElement"
Cohesion: 0.17
Nodes (13): bind(), _bindElement(), _bindItems(), _bindOccurrences(), _bindValue(), _createOccurrences(), createText(), _findDataByNameToConsume() (+5 more)

### Community 70 - "parseCMap"
Cohesion: 0.20
Nodes (12): expectInt(), expectString(), getUint32(), parseBfChar(), parseBfRange(), parseCidChar(), parseCidRange(), parseCMap() (+4 more)

### Community 73 - "background.js"
Cohesion: 0.29
Nodes (14): broadcastToAll(), broadcastToRuntime(), cleanupOverlayListeners(), clearCaptureState(), ensureOffscreenDocument(), injectOverlay(), isUncapturableUrl(), onOverlayTabRemoved() (+6 more)

### Community 74 - "bind"
Cohesion: 0.16
Nodes (11): addNativeFontFace(), bind(), createFontFaceRule(), createNativeFontFace(), insertRule(), KeyboardManager, loadSystemFont(), _prepareFontLoadEvent() (+3 more)

### Community 75 - ".getPattern"
Cohesion: 0.16
Nodes (6): applyBoundingBox(), CachedCanvases, drawFigure(), drawTriangle(), MeshShadingPattern, RadialAxialShadingPattern

### Community 76 - "process"
Cohesion: 0.23
Nodes (7): addHex(), BinaryCMapStream, hexToInt(), hexToStr(), incHex(), process(), readNumber()

### Community 80 - "fetchData"
Cohesion: 0.14
Nodes (7): BaseCMapReaderFactory, DOMCMapReaderFactory, DOMStandardFontDataFactory, fetchData(), isValidFetchUrl(), NodeCMapReaderFactory, NodeStandardFontDataFactory

### Community 82 - ".reset"
Cohesion: 0.18
Nodes (4): InclusionTree, parseTilePackets(), startXRef(), TimeSlotManager

### Community 83 - "Parser"
Cohesion: 0.33
Nodes (3): getFontFileType(), isTrueTypeCollectionFile(), Parser

### Community 84 - "Glyph"
Cohesion: 0.18
Nodes (5): CompositeGlyph, getSize(), Glyph, scale(), write()

### Community 88 - ".[r.$toHTML]"
Cohesion: 0.27
Nodes (8): applyAssist(), Draw, getBorderDims(), handleBreak(), handleOverflow(), setFirstUnsplittable(), setTabIndex(), unsetFirstUnsplittable()

### Community 91 - ".getByte"
Cohesion: 0.26
Nodes (4): FlateStream, getUint16(), parseImageProperties(), readXRefStream()

### Community 93 - "compileGlyf"
Cohesion: 0.17
Nodes (6): compileGlyf(), getFloat214(), getInt16(), getInt8(), GlyphHeader, TrueTypeCompiled

### Community 94 - "createPacket"
Cohesion: 0.27
Nodes (8): ComponentPositionResolutionLayerIterator(), createPacket(), getPrecinctIndexIfExist(), getPrecinctSizesInImageScale(), LayerResolutionComponentPositionIterator(), PositionComponentResolutionLayerIterator(), ResolutionLayerComponentPositionIterator(), ResolutionPositionComponentLayerIterator()

### Community 97 - ".[r.$pushGlyphs]"
Cohesion: 0.17
Nodes (5): addPara(), B, P, popFont(), pushData()

### Community 98 - "IdentityCMap"
Cohesion: 0.18
Nodes (3): createBuiltInCMap(), extendCMap(), IdentityCMap

### Community 99 - "encode"
Cohesion: 0.21
Nodes (12): _binaryDecode(), _binaryEncodeUserBroadcastPush(), decode(), _decodeUserBroadcast(), encode(), _encodeBinaryUserBroadcastPush(), _encodeJsonUserBroadcastPush(), _encodeUserBroadcastPush() (+4 more)

### Community 101 - "Caption"
Cohesion: 0.18
Nodes (3): Caption, Field, _setValue()

### Community 104 - "manifest.json"
Cohesion: 0.18
Nodes (10): background, service_worker, description, manifest_version, name, side_panel, default_path, update_url (+2 more)

### Community 106 - "parseCodestream"
Cohesion: 0.20
Nodes (9): buildCodeblocks(), buildPackets(), buildPrecincts(), calculateComponentDimensions(), calculateTileGrids(), getBlocksDimensions(), initializeTile(), parseCodestream() (+1 more)

### Community 109 - "FontInfo"
Cohesion: 0.27
Nodes (4): find(), FontInfo, getDefault(), PageSet

### Community 112 - "SimpleDOMNode"
Cohesion: 0.22
Nodes (3): _getSequence(), _parseArray(), SimpleDOMNode

### Community 118 - "Color"
Cohesion: 0.25
Nodes (3): Color, makeHexColor(), Stipple

### Community 124 - "rr"
Cohesion: 0.32
Nodes (8): createUser(), _deleteFactor(), deleteUser(), getUserById(), inviteUserByEmail(), rr(), updateUserById(), Vt()

### Community 125 - "commands"
Cohesion: 0.29
Nodes (8): commands, start-session, toggle-pause, description, suggested_key, default, description, suggested_key

### Community 126 - "permissions"
Cohesion: 0.25
Nodes (8): permissions, activeTab, identity, offscreen, scripting, sidePanel, storage, tabCapture

### Community 139 - "parseChunks"
Cohesion: 0.40
Nodes (6): parseChunks(), processSegment(), processSegments(), readRegionSegmentInformation(), readSegmentHeader(), readSegments()

### Community 144 - "accept"
Cohesion: 0.60
Nodes (5): accept(), expect(), nextToken(), parseBlock(), parseCondition()

### Community 156 - "default_icon"
Cohesion: 0.40
Nodes (5): action, default_icon, 128, 16, 48

### Community 167 - "icons"
Cohesion: 0.50
Nodes (4): icons, 128, 16, 48

## Knowledge Gaps
- **75 isolated node(s):** `PixelsPerInch`, `NodeFilterFactory`, `chromeStorageAdapter`, `supabaseClient`, `update_url` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **220 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f()` connect `f` to `PageArea`, `Text`, `.push`, `supabase.min.js`, `.onSymbolDictionary`, `ExData`, `.get`, `Template`, `Value`, `constructor`, `Ui`, `compileCharString`, `valueToHtml`, `Fill`, `XFAParser`, `Pattern`, `Subform`, `ariaLabel`, `.success`, `SubjectDN`, `_bindElement`, `.[r.$toHTML]`, `Area`, `Caption`, `ExclGroup`, `FontInfo`, `Color`, `.renderFileItem`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `pdf.worker.min.js`, `Text`, `.push`, `supabase.min.js`, `.i`, `AnnotationEditorUIManager`, `PartialEvaluator`, `parseChunks`, `WidgetAnnotation`, `.add`, `FreeTextEditor`, `has`, `.resolve`, `.get`, `constructor`, `checkAndRepair`, `handleOperation`, `log`, `PopupElement`, `constructor`, `WorkerTransport`, `unsubscribe`, `.parseXml`, `_debug`, `xfaFactory`, `createPacket`, `encode`, `.delete`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `composeSMask()` connect `compileCharString` to `PopupElement`, `pdf.min.js`, `CanvasGraphics`, `f`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 124 inferred relationships involving `f()` (e.g. with `composeSMask()` and `adjustMapping()`) actually correct?**
  _`f()` has 124 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PixelsPerInch`, `NodeFilterFactory`, `chromeStorageAdapter` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pdf.worker.min.js` be split into smaller, more focused modules?**
  _Cohesion score 0.008663667315175098 - nodes in this community are weakly interconnected._
- **Should `f` be split into smaller, more focused modules?**
  _Cohesion score 0.011892897481894892 - nodes in this community are weakly interconnected._