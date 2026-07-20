import { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import openSocket from "../../services/socket-io";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { getDefaultRoute } from "../../routes/defaultRoute";

const isTokenError = error => {
	const errorMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message;
	return (
		["ERR_SESSION_EXPIRED", "jwt expired", "jwt malformed"].includes(errorMsg) ||
		String(errorMsg || "").startsWith("Invalid token.")
	);
};

const useAuth = () => {
	const history = useHistory();
	const [isAuth, setIsAuth] = useState(false);
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState({});

	api.interceptors.request.use(
		config => {
			const token = localStorage.getItem("token");
			if (token) {
				config.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
				setIsAuth(true);
			}
			return config;
		},
		error => {
			Promise.reject(error);
		}
	);

	api.interceptors.response.use(
		response => {
			return response;
		},
		async error => {
			const originalRequest = error.config;
			if (error?.response?.status === 403 && isTokenError(error) && !originalRequest._retry) {
				originalRequest._retry = true;

				try {
					const { data } = await api.post("/auth/refresh_token");
					if (data) {
						localStorage.setItem("token", JSON.stringify(data.token));
						api.defaults.headers.Authorization = `Bearer ${data.token}`;
					}
					return api(originalRequest);
				} catch (refreshError) {
					localStorage.removeItem("token");
					api.defaults.headers.Authorization = undefined;
					setIsAuth(false);
					return Promise.reject(refreshError);
				}
			}
			if (error?.response?.status === 401) {
				localStorage.removeItem("token");
				api.defaults.headers.Authorization = undefined;
				setIsAuth(false);
			}
			return Promise.reject(error);
		}
	);

	useEffect(() => {
		const token = localStorage.getItem("token");
		(async () => {
			if (token) {
				try {
					api.defaults.headers.Authorization = `Bearer ${JSON.parse(token)}`;
					const { data } = await api.post("/auth/refresh_token");
					api.defaults.headers.Authorization = `Bearer ${data.token}`;
					localStorage.setItem("token", JSON.stringify(data.token));
					setIsAuth(true);
					setUser(data.user);
					if (data.user?.mustChangePassword && history.location.pathname !== "/login") {
						history.push("/login");
					}
				} catch (err) {
					localStorage.removeItem("token");
					api.defaults.headers.Authorization = undefined;
					setIsAuth(false);
				}
			}
			setLoading(false);
		})();
	}, []);

	useEffect(() => {
		const socket = openSocket();

		socket.on("user", data => {
			if (data.action === "update" && data.user.id === user.id) {
				setUser(data.user);
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [user]);

	const handleLogin = async userData => {
		setLoading(true);

		try {
			const { data } = await api.post("/auth/login", userData);
			localStorage.setItem("token", JSON.stringify(data.token));
			api.defaults.headers.Authorization = `Bearer ${data.token}`;
			setUser(data.user);
			setIsAuth(true);
			history.push(data.user?.mustChangePassword ? "/login" : getDefaultRoute(data.user));
			setLoading(false);
			return data.user;
		} catch (err) {
			toastError(err);
			setLoading(false);
			throw err;
		}
	};

	const handleChangePassword = async passwordData => {
		setLoading(true);

		try {
			const { data } = await api.post("/users/change-password", passwordData);
			setUser(data.user);
			history.push("/tickets");
			setLoading(false);
		} catch (err) {
			toastError(err);
			setLoading(false);
			throw err;
		}
	};

	const handleLogout = async () => {
		setLoading(true);

		try {
			await api.delete("/auth/logout");
			setIsAuth(false);
			setUser({});
			localStorage.removeItem("token");
			api.defaults.headers.Authorization = undefined;
			setLoading(false);
			history.push("/login");
		} catch (err) {
			toastError(err);
			setLoading(false);
		}
	};

	return { isAuth, user, loading, handleLogin, handleLogout, handleChangePassword };
};

export default useAuth;
