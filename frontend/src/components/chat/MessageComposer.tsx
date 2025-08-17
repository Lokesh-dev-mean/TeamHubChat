import React, { useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Paper,
  Divider,
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
import MoreVert from '@mui/icons-material/MoreVert';

interface Props {
  onSend: (text: string) => void;
  sx?: any;
  disabled?: boolean;
}

const MessageComposer: React.FC<Props> = ({ onSend, sx, disabled }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSend = () => {
    if (disabled) return;
    
    const text = editorRef.current?.innerText?.trim() || '';
    if (!text) return;
    
    try {
      onSend(text);
      editorRef.current!.innerHTML = '';
      setShowPlaceholder(true);
      setExpanded(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleInput = () => {
    const empty = editorRef.current?.innerText?.trim() === '';
    setShowPlaceholder(empty);
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        width: '100%',
        borderRadius: 1,
        ...sx,
      }}
    >
      {/* Show formatting toolbar only if expanded */}
      {expanded && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1,
            py: 0.5,
            gap: 0.5,
            flexWrap: 'wrap',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Tooltip title="Bold"><IconButton size="small" onClick={() => exec('bold')}><FormatBold fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Italic"><IconButton size="small" onClick={() => exec('italic')}><FormatItalic fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Underline"><IconButton size="small" onClick={() => exec('underline')}><FormatUnderlined fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Strikethrough"><IconButton size="small" onClick={() => exec('strikeThrough')}><StrikethroughS fontSize="small" /></IconButton></Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Tooltip title="Bulleted list"><IconButton size="small" onClick={() => exec('insertUnorderedList')}><FormatListBulleted fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Numbered list"><IconButton size="small" onClick={() => exec('insertOrderedList')}><FormatListNumbered fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Quote"><IconButton size="small" onClick={() => exec('formatBlock', 'blockquote')}><FormatQuote fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Inline code"><IconButton size="small" onClick={() => exec('formatBlock', 'pre')}><Code fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Insert link"><IconButton size="small" onClick={() => {
            const url = prompt('Enter URL');
            if (url) exec('createLink', url);
          }}><LinkIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Clear formatting"><IconButton size="small" onClick={() => exec('removeFormat')}><ClearAll fontSize="small" /></IconButton></Tooltip>
        </Box>
      )}

      {/* Editor + actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5 }}>
        <Box
          ref={editorRef}
          component="div"
          contentEditable={!disabled}
          suppressContentEditableWarning
          onClick={() => !disabled && setExpanded(true)}
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          sx={{
            flex: 1,
            minHeight: 40,
            maxHeight: expanded ? 150 : 40,
            overflowY: 'auto',
            outline: 'none',
            px: 1,
            py: 0.5,
            fontSize: '0.9375rem',
            lineHeight: 1.5,
            borderRadius: 1,
            cursor: disabled ? 'not-allowed' : 'text',
            opacity: disabled ? 0.7 : 1,
            backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper',
            '&:focus': {
              outline: 'none',
              boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}40`,
            },
          }}
        />
        {showPlaceholder && !expanded && (
          <Box
            sx={{
              position: 'absolute',
              left: 20,
              color: 'text.secondary',
              fontSize: '0.875rem',
              pointerEvents: 'none',
            }}
          >
            Type a message
          </Box>
        )}
        <IconButton size="small" disabled={disabled}><EmojiEmotions fontSize="small" /></IconButton>
        <IconButton size="small" disabled={disabled}><AttachFile fontSize="small" /></IconButton>
        <IconButton size="small" disabled={disabled}><MoreVert fontSize="small" /></IconButton>
        <IconButton 
          size="small" 
          color="primary" 
          onClick={handleSend}
          disabled={disabled}
          sx={disabled ? { color: 'text.disabled' } : {}}
        >
          <Send fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default MessageComposer;
