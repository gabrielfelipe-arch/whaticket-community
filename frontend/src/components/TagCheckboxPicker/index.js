import React from "react";

import {
  Button,
  Checkbox,
  Divider,
  InputAdornment,
  MenuItem,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import SearchIcon from "@material-ui/icons/Search";

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
    justifyContent: "flex-start",
    flexWrap: "wrap",
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
    cursor: "default"
  },
  menuSearch: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
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

const normalizeSearch = value =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const TagCheckboxPicker = ({
  tags = [],
  selectedIds = [],
  onChange,
  label = "Etiquetas",
  helperText,
  fullWidth = true,
  margin = "dense",
  size = "small",
  disabled = false,
  onCreateTag
}) => {
  const classes = useStyles();
  const [search, setSearch] = React.useState("");
  const normalizedSelected = (selectedIds || []).map(Number);
  const selectedSet = new Set(normalizedSelected);
  const filteredTags = tags.filter(tag => normalizeSearch(tag.name).includes(normalizeSearch(search)));

  const handleChange = event => {
    const value = Array.isArray(event.target.value) ? event.target.value : [];
    onChange(value.filter(item => !["__actions", "__search"].includes(item)).map(Number));
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
        renderValue: selected => `${selected.length} etiqueta(s) selecionada(s)`,
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
            onChange(filteredTags.map(tag => Number(tag.id)));
          }}
          disabled={!filteredTags.length}
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
        {onCreateTag && (
          <Button
            size="small"
            color="primary"
            variant="outlined"
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              onCreateTag();
            }}
          >
            Nova etiqueta
          </Button>
        )}
      </MenuItem>
      <Divider />
      <MenuItem
        value="__search"
        className={classes.menuSearch}
        onClick={event => event.stopPropagation()}
      >
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Buscar etiqueta"
          value={search}
          onChange={event => setSearch(event.target.value)}
          onClick={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            )
          }}
        />
      </MenuItem>
      <Divider />
      {filteredTags.map(tag => (
        <MenuItem key={tag.id} value={Number(tag.id)} className={classes.menuItem}>
          <Checkbox color="primary" checked={selectedSet.has(Number(tag.id))} />
          <span className={classes.tagColor} style={{ backgroundColor: tag.color || "#607d8b" }} />
          <span className={classes.tagName}>{tag.name}</span>
        </MenuItem>
      ))}
      {!filteredTags.length && (
        <MenuItem disabled>
          <Typography variant="body2">
            {tags.length ? "Nenhuma etiqueta encontrada." : "Nenhuma etiqueta cadastrada."}
          </Typography>
        </MenuItem>
      )}
    </TextField>
  );
};

export default TagCheckboxPicker;
