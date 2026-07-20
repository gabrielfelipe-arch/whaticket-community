import React, { useRef, useState } from "react";
import { Field } from "formik";
import {
	Button,
	MenuItem,
	Paper,
	Popper,
	TextField,
	Typography
} from "@material-ui/core";

export const MESSAGE_TEMPLATE_VARIABLES = [
	{ value: "{{nome_contato}}", label: "Nome do contato" },
	{ value: "{{telefone_contato}}", label: "Telefone do contato" },
	{ value: "{{nome_atendente}}", label: "Nome do atendente" },
	{ value: "{{nome_ia}}", label: "Nome da IA" },
	{ value: "{{nome_empresa}}", label: "Nome da empresa" },
	{ value: "{{empresa_nome}}", label: "Nome fantasia" },
	{ value: "{{empresa_razao_social}}", label: "Razao social" },
	{ value: "{{empresa_cnpj}}", label: "CNPJ" },
	{ value: "{{empresa_endereco}}", label: "Endereco da empresa" },
	{ value: "{{empresa_telefone}}", label: "Telefone da empresa" },
	{ value: "{{empresa_email}}", label: "E-mail da empresa" },
	{ value: "{{empresa_site}}", label: "Site da empresa" },
	{ value: "{{empresa_pix}}", label: "PIX" },
	{ value: "{{dados_pagamento}}", label: "Dados de pagamento" },
	{ value: "{{tipo_atendimento}}", label: "Tipo de atendimento" },
	{ value: "{{fila}}", label: "Fila" },
	{ value: "{{fila_humana}}", label: "Fila humana" },
	{ value: "{{categoria}}", label: "Categoria" },
	{ value: "{{motivo_encerramento}}", label: "Motivo de encerramento" },
	{ value: "{{ultima_mensagem}}", label: "Ultima mensagem" },
	{ value: "{{data_hora}}", label: "Data e hora" }
];

const MessageTemplateField = ({
	label,
	name,
	value,
	onChange,
	formik = false,
	rows = 4,
	helperText,
	error,
	whatsappToolbar = true,
	variables = MESSAGE_TEMPLATE_VARIABLES,
	onMediaChange,
	mediaName,
	...rest
}) => {
	const [anchorEl, setAnchorEl] = useState(null);
	const [caret, setCaret] = useState(0);
	const inputRef = useRef(null);

	const shouldOpen = text => {
		const beforeCursor = text.slice(0, caret || text.length);
		return beforeCursor.endsWith("{{");
	};

	const handleTextChange = (event, setFieldValue) => {
		const nextValue = event.target.value;
		const nextCaret = event.target.selectionStart || nextValue.length;
		setCaret(nextCaret);
		setAnchorEl(nextValue.slice(0, nextCaret).endsWith("{{") ? event.currentTarget : null);

		if (formik) {
			setFieldValue(name, nextValue);
		} else {
			onChange({ target: { name, value: nextValue } });
		}
	};

	const insertVariable = (variable, currentValue, setFieldValue) => {
		const text = currentValue || "";
		const insertAt = caret || text.length;
		const before = text.slice(0, insertAt).replace(/\{\{$/, "");
		const after = text.slice(insertAt);
		const nextValue = `${before}${variable}${after}`;

		setAnchorEl(null);
		if (formik) {
			setFieldValue(name, nextValue);
		} else {
			onChange({ target: { name, value: nextValue } });
		}
	};

	const setValue = (nextValue, setFieldValue) => {
		if (formik) {
			setFieldValue(name, nextValue);
		} else {
			onChange({ target: { name, value: nextValue } });
		}
	};

	const applyWrap = (beforeToken, afterToken, currentValue, setFieldValue) => {
		const input = inputRef.current;
		const text = currentValue || "";
		const start = input?.selectionStart ?? text.length;
		const end = input?.selectionEnd ?? text.length;
		const selected = text.slice(start, end) || "texto";
		const nextValue = `${text.slice(0, start)}${beforeToken}${selected}${afterToken}${text.slice(end)}`;
		setValue(nextValue, setFieldValue);
		setTimeout(() => input?.focus(), 0);
	};

	const insertText = (insertedText, currentValue, setFieldValue) => {
		const input = inputRef.current;
		const text = currentValue || "";
		const start = input?.selectionStart ?? text.length;
		const end = input?.selectionEnd ?? text.length;
		const nextValue = `${text.slice(0, start)}${insertedText}${text.slice(end)}`;
		setValue(nextValue, setFieldValue);
		setTimeout(() => input?.focus(), 0);
	};

	const renderField = ({ field = {}, form = {} } = {}) => {
		const currentValue = formik ? field.value : value;
		const setFieldValue = formik ? form.setFieldValue : null;

		return (
			<>
				{whatsappToolbar && (
					<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
						<button type="button" onClick={() => applyWrap("*", "*", currentValue, setFieldValue)}><strong>B</strong></button>
						<button type="button" onClick={() => applyWrap("_", "_", currentValue, setFieldValue)}><em>I</em></button>
						<button type="button" onClick={() => applyWrap("~", "~", currentValue, setFieldValue)}>S</button>
						<button type="button" onClick={() => insertText("\n", currentValue, setFieldValue)}>Linha</button>
						{["😊", "✅", "📌", "💙", "⚠️"].map(emoji => (
							<button key={emoji} type="button" onClick={() => insertText(emoji, currentValue, setFieldValue)}>{emoji}</button>
						))}
						{onMediaChange && (
							<label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
								<input
									type="file"
									accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
									style={{ display: "none" }}
									onChange={event => onMediaChange(event.target.files?.[0] || null)}
								/>
								<Button type="button" size="small" variant="outlined" component="span">
									Escolher arquivo
								</Button>
								{mediaName && <Typography variant="caption">{mediaName}</Typography>}
							</label>
						)}
					</div>
				)}
				<TextField
					{...rest}
					fullWidth
					multiline
					rows={rows}
					margin="dense"
					variant="outlined"
					label={label}
					name={name}
					value={currentValue || ""}
					inputRef={inputRef}
					error={error}
					helperText={helperText || "Digite {{ para inserir campos automaticamente na mensagem."}
					onChange={event => handleTextChange(event, setFieldValue)}
					onKeyUp={event => {
						setCaret(event.currentTarget.selectionStart || 0);
						setAnchorEl(shouldOpen(event.currentTarget.value) ? event.currentTarget : null);
					}}
				/>
				<Popper open={Boolean(anchorEl)} anchorEl={anchorEl} placement="bottom-start" style={{ zIndex: 2000 }}>
					<Paper elevation={4} style={{ maxHeight: 260, overflowY: "auto", minWidth: 280 }}>
						<Typography variant="caption" style={{ display: "block", padding: 8 }}>
							Inserir campo
						</Typography>
						{variables.map(item => (
							<MenuItem
								key={item.value}
								dense
								onMouseDown={event => {
									event.preventDefault();
									insertVariable(item.value, currentValue, setFieldValue);
								}}
							>
								{item.label} <Typography variant="caption" style={{ marginLeft: 8 }}>{item.value}</Typography>
							</MenuItem>
						))}
					</Paper>
				</Popper>
			</>
		);
	};

	if (formik) {
		return <Field name={name}>{renderField}</Field>;
	}

	return renderField();
};

export default MessageTemplateField;
