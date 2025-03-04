import React from "react";
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, IconButton } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';

interface PrincipalsModalProps {
  principals: string[];
  onClose: () => void;
}

const PrincipalsModal: React.FC<PrincipalsModalProps> = ({ principals, onClose }) => {
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Principals
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: 300 }}>
        <List>
          {principals.map((principal, index) => (
            <ListItem key={index}>
              <ListItemText primary={principal} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default PrincipalsModal;
