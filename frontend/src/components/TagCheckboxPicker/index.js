import React from "react";

import {
  Button,
  Checkbox,
  Chip,
  Divider,
  MenuItem,
  TextField
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.5)
  },
  menuActions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    justifyContent: "space-between",
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
    cursor: "default"
  },
  menuItem: {
    minHeight: 42
  },
  tagColor: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    marginRight: theme.spacing(1),
    flexShrink: 0
  },
  tagName: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  }
}));

const TagCheckboxPicker = ({
  tags = [],
  selectedIds = [],
  onChange,
  label = "Etiquetas",
  helperText,
  fullWidth = true,
  margin = "dense",
  size = "small",
  disabled = false
}) => {
  const classes = useStyles();
  const normalizedSelected = (selectedIds || []).map(Number);
  const selectedSet = new Set(normalizedSelected);

  const handleChange = event => {
    const value = Array.isArray(event.target.value) ? event.target.value : [];
    onChange(value.filter(item => item !== "__actions").map(Number));
  };

  const removeTag = (event, tagId) => {
    event.preventDefault();
    event.stopPropagation();
    onChange(normalizedSelected.filter(id => Number(id) !== Number(tagId)));
  };

  return (
    <TextField
      select
      fullWidth={fullWidth}
      margin={margin}
      size={size}
      variant="outlined"
      label={label}
      value={normalizedSelected}
      onChange={handleChange}
      helperText={helperText}
      disabled={disabled}
      SelectProps={{
        multiple: true,
        renderValue: selected => (
          <div className={classes.chips}>
            {selected.map(tagId => {
              const tag = tags.find(item => Number(item.id) === Number(tagId));
              return (
                <Chip
                  key={tagId}
                  size="small"
                  label={tag?.name || tagId}
                  onMouseDown={event => event.stopPropagation()}
                  onDelete={event => removeTag(event, tagId)}
                  style={{ backgroundColor: tag?.color || "#607d8b", color: "#fff" }}
                />
              );
            })}
          </div>
        ),
        MenuProps: {
          PaperProps: {
            style: { maxHeight: 360, minWidth: 280 }
          },
          getContentAnchorEl: null
        }
      }}
    >
      <MenuItem
        value="__actions"
        className={classes.menuActions}
        onClick={event => event.stopPropagation()}
      >
        <Button
          size="small"
          color="primary"
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            onChange(tags.map(tag => Number(tag.id)));
          }}
          disabled={!tags.length}
        >
          Marcar todas
        </Button>
        <Button
          size="small"
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            onChange([]);
          }}
          disabled={!normalizedSelected.length}
        >
          Limpar
        </Button>
      </MenuItem>
      <Divider />
      {tags.map(tag => (
        <MenuItem key={tag.id} value={Number(tag.id)} className={classes.menuItem}>
          <Checkbox color="primary" checked={selectedSet.has(Number(tag.id))} />
          <span className={classes.tagColor} style={{ backgroundColor: tag.color || "#607d8b" }} />
          <span className={classes.tagName}>{tag.name}</span>
        </MenuItem>
      ))}
      {!tags.length && (
        <MenuItem disabled>Nenhuma etiqueta cadastrada.</MenuItem>
      )}
    </TextField>
  );
};

export default TagCheckboxPicker;
