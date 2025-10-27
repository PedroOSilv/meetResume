class LoginManager {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('loginBtn');
        this.errorMessage = document.getElementById('errorMessage');
        
        this.init();
    }
    
    init() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Verificar se já está logado
        if (this.isLoggedIn()) {
            this.redirectToApp();
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        
        if (!email || !password) {
            this.showError('Por favor, preencha todos os campos');
            return;
        }
        
        this.setLoading(true);
        this.hideError();
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Salvar token e redirecionar
                localStorage.setItem('audio_ai_token', data.token);
                localStorage.setItem('audio_ai_user', JSON.stringify(data.user));
                
                this.showSuccess('Login realizado com sucesso!');
                
                setTimeout(() => {
                    this.redirectToApp();
                }, 1000);
            } else {
                this.showError(data.message || 'Erro ao fazer login');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError('Erro de conexão. Tente novamente.');
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(loading) {
        const btnText = this.loginBtn.querySelector('.btn-text');
        const btnLoading = this.loginBtn.querySelector('.btn-loading');
        
        if (loading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            this.loginBtn.disabled = true;
        } else {
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
            this.loginBtn.disabled = false;
        }
    }
    
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        
        // Auto-hide após 5 segundos
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }
    
    showSuccess(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.errorMessage.style.background = 'rgba(16, 185, 129, 0.1)';
        this.errorMessage.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        this.errorMessage.style.color = '#10b981';
    }
    
    hideError() {
        this.errorMessage.style.display = 'none';
        this.errorMessage.style.background = 'rgba(239, 68, 68, 0.1)';
        this.errorMessage.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        this.errorMessage.style.color = '#ef4444';
    }
    
    isLoggedIn() {
        const token = localStorage.getItem('audio_ai_token');
        return token && this.isTokenValid(token);
    }
    
    isTokenValid(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            return payload.exp > now;
        } catch {
            return false;
        }
    }
    
    redirectToApp() {
        window.location.href = '/';
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});

