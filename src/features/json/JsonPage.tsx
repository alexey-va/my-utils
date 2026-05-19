import { useMemo } from "react";
import {
  Space,
  Input,
  Button,
  Typography,
  Upload,
  Switch,
  Select,
  Card,
} from "antd";
import {
  UploadOutlined,
  CopyOutlined,
  DownloadOutlined,
  ScissorOutlined,
  SaveOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import jsonLang from "react-syntax-highlighter/dist/esm/languages/prism/json";
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";
import PageLayout from "../../shared/components/PageLayout";
import AppPanel from "../../shared/components/AppPanel";
import { useJsonTool } from "./useJsonTool";

SyntaxHighlighter.registerLanguage("json", jsonLang);

const { TextArea } = Input;

export default function JsonPage() {
  const tool = useJsonTool();

  const previewNode = useMemo(() => {
    if (!tool.output) return null;
    if (!tool.highlight) {
      return (
        <TextArea value={tool.output} readOnly autoSize={{ minRows: 8 }} spellCheck={false} />
      );
    }
    return (
      <SyntaxHighlighter
        language="json"
        style={vscDarkPlus}
        wrapLongLines
        customStyle={{ background: "transparent", margin: 0, padding: 12, borderRadius: 8 }}
      >
        {tool.output}
      </SyntaxHighlighter>
    );
  }, [tool.output, tool.highlight]);

  return (
    <PageLayout title="JSON Prettify" subtitle="Format, minify, and validate JSON">
      <AppPanel className="json-tool">
        <Space direction="vertical" size="middle" className="json-tool__stack">
          <Space wrap className="json-tool__toolbar">
            <Upload
              beforeUpload={tool.beforeUpload}
              accept=".json,.txt,application/json"
              maxCount={1}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>Load file</Button>
            </Upload>
            <Button
              type={tool.formatMode === "pretty" ? "primary" : "default"}
              onClick={tool.prettify}
              disabled={!tool.hasInput}
            >
              Prettify
            </Button>
            <Button
              type={tool.formatMode === "minify" ? "primary" : "default"}
              onClick={tool.minify}
              icon={<ScissorOutlined />}
              disabled={!tool.hasInput}
            >
              Minify
            </Button>
            <Button onClick={tool.handleCopy} icon={<CopyOutlined />} disabled={!tool.hasContent}>
              Copy
            </Button>
            <Button onClick={tool.handleDownload} icon={<DownloadOutlined />} disabled={!tool.hasContent}>
              Download
            </Button>
            <Button onClick={() => tool.saveToHistory()} icon={<SaveOutlined />} disabled={!tool.hasInput}>
              Save to history
            </Button>
          </Space>

          <Space wrap className="json-tool__options">
            <Typography.Text type="secondary">Indent</Typography.Text>
            <Select
              value={tool.indent}
              onChange={tool.setIndent}
              options={[0, 2, 4, 6, 8].map((n) => ({ value: n, label: String(n) }))}
              style={{ width: 96 }}
            />
            <Typography.Text type="secondary">Sort keys</Typography.Text>
            <Switch checked={tool.sortKeys} onChange={tool.setSortKeys} />
            <Typography.Text type="secondary">Highlight</Typography.Text>
            <Switch checked={tool.highlight} onChange={tool.setHighlight} />
          </Space>

          <div className="json-tool__history">
            <Typography.Text type="secondary">History (last {tool.historyLimit})</Typography.Text>
            <Space wrap className="json-tool__history-row">
              <Select
                placeholder="Select a previous input"
                value={tool.selectedHistId}
                onChange={tool.loadFromHistory}
                options={tool.historyOptions}
                className="json-tool__history-select"
                showSearch
                optionFilterProp="label"
              />
              <Button
                icon={<DeleteOutlined />}
                danger
                disabled={!tool.selectedHistId}
                onClick={() => tool.selectedHistId && tool.deleteHistoryItem(tool.selectedHistId)}
              >
                Delete selected
              </Button>
              <Button danger onClick={tool.clearHistory} disabled={!tool.history.length}>
                Clear all
              </Button>
            </Space>
          </div>

          <TextArea
            className="json-tool__input"
            status={tool.parseErr ? "error" : undefined}
            placeholder="Paste raw JSON here"
            value={tool.input}
            onChange={(e) => tool.setInput(e.target.value)}
            autoSize={{ minRows: 10 }}
            spellCheck={false}
          />

          {tool.parseErr && (
            <Card size="small" className="json-tool__error" title={`Parse error${tool.parseErr.line > 0 ? ` at ${tool.parseErr.line}:${tool.parseErr.col}` : ""}`}>
              <Typography.Paragraph className="json-tool__error-msg">{tool.parseErr.message}</Typography.Paragraph>
              {tool.parseErr.excerpt ? (
                <pre className="json-tool__error-excerpt">{tool.parseErr.excerpt}</pre>
              ) : null}
            </Card>
          )}

          {tool.output ? (
            <Card size="small" className="json-tool__output" title="Output">
              {previewNode}
            </Card>
          ) : null}
        </Space>
      </AppPanel>
    </PageLayout>
  );
}
