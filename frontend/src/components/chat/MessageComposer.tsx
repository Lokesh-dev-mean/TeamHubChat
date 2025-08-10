import React, { useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Menu,
  MenuItem,
  TextField,
  Button
} from '@mui/material';
import FormatBold from '@mui/icons-material/FormatBold';
import FormatItalic from '@mui/icons-material/FormatItalic';
import FormatUnderlined from '@mui/icons-material/FormatUnderlined';
import StrikethroughS from '@mui/icons-material/StrikethroughS';
import Code from '@mui/icons-material/Code';
import FormatListBulleted from '@mui/icons-material/FormatListBulleted';
import FormatListNumbered from '@mui/icons-material/FormatListNumbered';
import LinkIcon from '@mui/icons-material/Link';
import FormatQuote from '@mui/icons-material/FormatQuote';
import ClearAll from '@mui/icons-material/ClearAll';
import EmojiEmotions from '@mui/icons-material/EmojiEmotions';
import AttachFile from '@mui/icons-material/AttachFile';
import Send from '@mui/icons-material/Send';
import ScheduleSend from '@mui/icons-material/ScheduleSend';
import MoreVert from '@mui/icons-material/MoreVert';
import { toast } from '../../utils/toast';

interface Props {
  onSend: (text: string, scheduledAt?: string) => void;
}

// Lightweight rich text composer using contenteditable
const MessageComposer: React.FC<Props> = ({ onSend }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [scheduleAnchor, setScheduleAnchor] = useState<null | HTMLElement>(null);
  const [scheduledAt, setScheduledAt] = useState('');

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt('Enter URL');
    if (url) exec('createLink', url);
  };

  const clearFormatting = () => {
    exec('removeFormat');
  };

  const handleSend = () => {
    const text = editorRef.current?.innerText?.trim() || '';
    if (!text) return;
    onSend(text, scheduledAt || undefined);
    if (!scheduledAt) editorRef.current!.innerHTML = '';
    setScheduledAt('');
  };

  const onAttach = () => fileRef.current?.click();

  return (
    <Paper variant="outlined" sx={{ width: '100%', borderRadius: 1 }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5, gap: 0.5, flexWrap: 'wrap' }}>
        <Tooltip title="Bold"><IconButton size="small" onClick={() => exec('bold')}><FormatBold fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Italic"><IconButton size="small" onClick={() => exec('italic')}><FormatItalic fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Underline"><IconButton size="small" onClick={() => exec('underline')}><FormatUnderlined fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Strikethrough"><IconButton size="small" onClick={() => exec('strikeThrough')}><StrikethroughS fontSize="small" /></IconButton></Tooltip>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Tooltip title="Bulleted list"><IconButton size="small" onClick={() => exec('insertUnorderedList')}><FormatListBulleted fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Numbered list"><IconButton size="small" onClick={() => exec('insertOrderedList')}><FormatListNumbered fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Quote"><IconButton size="small" onClick={() => exec('formatBlock', 'blockquote')}><FormatQuote fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Inline code"><IconButton size="small" onClick={() => exec('formatBlock', 'pre')}><Code fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Insert link"><IconButton size="small" onClick={insertLink}><LinkIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Clear formatting"><IconButton size="small" onClick={clearFormatting}><ClearAll fontSize="small" /></IconButton></Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="More">
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}><MoreVert fontSize="small" /></IconButton>
        </Tooltip>
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={() => { setMenuAnchor(null); toast.info('Delivery options coming soon'); }}>Set delivery options</MenuItem>
          <MenuItem onClick={() => { setMenuAnchor(null); toast.info('Record video clip coming soon'); }}>Record video clip</MenuItem>
          <MenuItem onClick={() => { setMenuAnchor(null); toast.info('Schedule meeting coming soon'); }}>Schedule meeting</MenuItem>
        </Menu>
      </Box>
      <Divider />
      {/* Editor – replaceable with full editor library later */}
      <Box sx={{ px: 1.5, py: 1 }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          aria-multiline
          style={{ minHeight: 90, outline: 'none' }}
          data-placeholder="Type a message"
        />
      </Box>
      <Divider />
      {/* Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 1, gap: 1 }}>
        <Tooltip title="Emoji"><IconButton size="small"><EmojiEmotions /></IconButton></Tooltip>
        <Tooltip title="Attach file"><IconButton size="small" onClick={onAttach}><AttachFile /></IconButton></Tooltip>
        <input ref={fileRef} type="file" hidden multiple onChange={() => toast.info('Attachments will be sent with next message')} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Schedule send">
          <IconButton size="small" onClick={(e) => setScheduleAnchor(e.currentTarget)}><ScheduleSend /></IconButton>
        </Tooltip>
        <Menu anchorEl={scheduleAnchor} open={!!scheduleAnchor} onClose={() => setScheduleAnchor(null)}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <Button variant="contained" onClick={() => { setScheduleAnchor(null); toast.success('Message scheduled'); }}>Set</Button>
          </Box>
        </Menu>
        <Tooltip title="Send">
          <IconButton color="primary" onClick={handleSend}><Send /></IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default MessageComposer;


