document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal');
  const yapeModal = document.getElementById('yape');
  const modalTitulo = document.getElementById('modal-titulo');
  const modalImagen = document.getElementById('modal-imagen');
  const modalPrecio = document.getElementById('modal-precio');
  const modalDescripcionLista = document.getElementById('modal-descripcion-lista');
  const btnCerrar = document.querySelectorAll('.btn-close');
  const btnCopiar = document.querySelector('.btn-copy');
  const btnEnviar = document.getElementById('sendReceipt');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-options');
  const currencySelect = document.getElementById('currency-select');
  const productosContainer = document.querySelector('.productos');

  // Sanitize input to prevent XSS
  function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  // Check if cached exchange rate is valid (less than 24 hours old)
  function getCachedExchangeRate() {
    const cachedData = localStorage.getItem('exchangeRate');
    if (cachedData) {
      const { rate, timestamp } = JSON.parse(cachedData);
      const now = Date.now();
      const cacheDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (now - timestamp < cacheDuration) {
        return rate;
      }
    }
    return null;
  }

  // Save exchange rate to localStorage
  function saveExchangeRate(rate) {
    const data = {
      rate,
      timestamp: Date.now()
    };
    localStorage.setItem('exchangeRate', JSON.stringify(data));
  }

  // Fetch exchange rate from API
  async function fetchExchangeRate() {
    const cachedRate = getCachedExchangeRate();
    if (cachedRate) {
      return cachedRate;
    }
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/PEN');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      const rate = data.rates.USD;
      saveExchangeRate(rate);
      return rate;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      return 0.27; // Fallback rate in case of error
    }
  }

  // Update prices based on currency
  async function updatePrices(currency) {
    const exchangeRate = currency === 'USD' ? await fetchExchangeRate() : 1;
    document.querySelectorAll('.precio').forEach(precio => {
      const precioOriginal = parseFloat(precio.getAttribute('data-precio-original'));
      let newPrice;
      if (currency === 'USD') {
        newPrice = (precioOriginal * exchangeRate).toFixed(2);
        precio.textContent = `$ ${newPrice}`;
      } else {
        newPrice = precioOriginal.toFixed(2);
        precio.textContent = `S/ ${newPrice}`;
      }
    });
  }

  // Load products dynamically
  fetch('products.json')
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      data.forEach(product => {
        const productoDiv = document.createElement('div');
        productoDiv.className = 'producto';
        // Extract numeric value from price
        const precioOriginal = parseFloat(product.price.replace(/[^0-9.]/g, ''));
        productoDiv.innerHTML = `
          <img src="${product.image}" alt="${product.title}" loading="lazy">
          <h3>${product.title}</h3>
          <p>${product.subtitle}</p>
          <p class="precio" data-precio-original="${precioOriginal}">${product.price}</p>
          <button class="btn-comprar" data-descripcion="${product.description}">Ver más</button>
        `;
        productosContainer.appendChild(productoDiv);
      });

      // Attach event listeners for "Ver más" buttons
// Attach event listeners for "Ver más" buttons
const botonesVerMas = document.querySelectorAll('.btn-comprar:not(.open-yape)');
botonesVerMas.forEach(boton => {
  boton.addEventListener('click', () => {
    const producto = boton.closest('.producto');
    modalTitulo.textContent = producto.querySelector('h3').textContent;
    modalImagen.src = producto.querySelector('img').src;
    modalImagen.alt = producto.querySelector('h3').textContent;
    modalPrecio.textContent = producto.querySelector('.precio').textContent;
    modalDescripcionLista.innerHTML = ''; // Clear existing content

    const descripcion = boton.getAttribute('data-descripcion').split('\n');
    let incluyeSection = false;
    let entregaSection = false;

    descripcion.forEach(item => {
      const li = document.createElement('li');
      if (item.includes('INCLUYE:')) {
        incluyeSection = true;
        entregaSection = false;
        li.textContent = item;
        li.style.fontWeight = 'bold';
        li.style.marginTop = '1rem';
      } else if (item.includes('SE ENTREGA:')) {
        entregaSection = true;
        incluyeSection = false;
        li.textContent = item;
        li.style.fontWeight = 'bold';
        li.style.marginTop = '1rem';
      } else if (item.trim() && (incluyeSection || entregaSection)) {
        li.textContent = item.trim();
      }
      if (li.textContent.trim()) {
        modalDescripcionLista.appendChild(li);
      }
    });

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  });
  boton.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      boton.click();
    }
  });
});

      // Search functionality
      searchInput.addEventListener('input', () => {
        const query = sanitizeInput(searchInput.value).toLowerCase();
        document.querySelectorAll('.producto').forEach(producto => {
          const titulo = producto.querySelector('h3').textContent.toLowerCase();
          producto.style.display = titulo.includes(query) ? 'block' : 'none';
        });
      });

      // Sort functionality
      sortSelect.addEventListener('change', () => {
        const productosArray = Array.from(document.querySelectorAll('.producto'));
        const sortValue = sortSelect.value;
        productosArray.sort((a, b) => {
          const titleA = a.querySelector('h3').textContent.toLowerCase();
          const titleB = b.querySelector('h3').textContent.toLowerCase();
          const priceA = parseFloat(a.querySelector('.precio').getAttribute('data-precio-original'));
          const priceB = parseFloat(b.querySelector('.precio').getAttribute('data-precio-original'));
          if (sortValue === 'name-asc') return titleA.localeCompare(titleB);
          if (sortValue === 'name-desc') return titleB.localeCompare(titleA);
          if (sortValue === 'price-asc') return priceA - priceB;
          if (sortValue === 'price-desc') return priceB - priceA;
        });
        productosContainer.innerHTML = '';
        productosArray.forEach(producto => productosContainer.appendChild(producto));
        // Reapply current currency after sorting
        updatePrices(currencySelect.value);
      });
    })
    .catch(error => console.error('Error loading products:', error));

  // Currency conversion
  currencySelect.addEventListener('change', () => {
    updatePrices(currencySelect.value);
  });

  // Open Yape modal from product modal
  document.querySelector('.modal-actions .open-yape').addEventListener('click', () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    yapeModal.style.display = 'flex';
    yapeModal.setAttribute('aria-hidden', 'false');
  });

  // Copy Yape number
// Copy Yape number
function copiarNumeroYape() {
  const spinner = document.getElementById('copy-spinner');
  const yapeNumber = document.getElementById('yape-number').textContent;
  const toast = document.getElementById('toast');

  spinner.style.display = 'block';

  // Intento principal con navigator.clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(yapeNumber)
      .then(() => {
        spinner.style.display = 'none';
        toast.textContent = 'Número copiado al portapapeles';
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
      })
      .catch(err => {
        spinner.style.display = 'none';
        console.error('Error al copiar con clipboard:', err);
        // Fallback: intento de copiar seleccionando el texto
        const tempInput = document.createElement('input');
        tempInput.value = yapeNumber;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        toast.textContent = 'Número copiado (método alternativo)';
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
      });
  } else {
    // Fallback si navigator.clipboard no está disponible
    const tempInput = document.createElement('input');
    tempInput.value = yapeNumber;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      spinner.style.display = 'none';
      toast.textContent = 'Número copiado (método alternativo)';
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2000);
    } catch (err) {
      spinner.style.display = 'none';
      toast.textContent = 'Error al copiar el número';
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2000);
      console.error('Error al copiar:', err);
    }
    document.body.removeChild(tempInput);
  }
}

btnCopiar.addEventListener('click', copiarNumeroYape);
btnCopiar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    copiarNumeroYape();
  }
});

  // Send payment receipt
  function enviarComprobante() {
    const productoNombre = modalTitulo.textContent || 'Producto no especificado';
    const productoPrecio = modalPrecio.textContent || 'Precio no especificado';
    const mensaje = encodeURIComponent(
      `Hola, acabo de realizar un pago por Yape. Producto: ${productoNombre}, Precio: ${productoPrecio}. Aquí está mi comprobante:`
    );
    window.open(`https://wa.me/51950441700?text=${mensaje}`, '_blank');
    const toast = document.getElementById('toast');
    toast.textContent = 'Redirigiendo a WhatsApp...';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
  }
  btnEnviar.addEventListener('click', enviarComprobante);
  btnEnviar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      enviarComprobante();
    }
  });

  // Close modals
  btnCerrar.forEach(button => {
    button.addEventListener('click', () => {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      yapeModal.style.display = 'none';
      yapeModal.setAttribute('aria-hidden', 'true');
    });
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });
  });

  // Close modals on click outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
  });

  yapeModal.addEventListener('click', (e) => {
    if (e.target === yapeModal) {
      yapeModal.style.display = 'none';
      yapeModal.setAttribute('aria-hidden', 'true');
    }
  });

  // FAQ toggle functionality
  const faqQuestions = document.querySelectorAll('.faq-question');
  const faqAnswers = document.querySelectorAll('.faq-answer');
  faqQuestions.forEach((question, index) => {
    question.setAttribute('aria-controls', `faq-answer-${index + 1}`);
    question.style.cursor = 'pointer';
    question.addEventListener('click', () => {
      faqAnswers.forEach(answer => {
        answer.style.display = 'none';
        answer.setAttribute('aria-hidden', 'true');
      });
      faqQuestions.forEach(q => {
        q.classList.remove('active');
        q.setAttribute('aria-expanded', 'false');
      });
      const answer = faqAnswers[index];
      if (answer.style.display === 'block') {
        answer.style.display = 'none';
        answer.setAttribute('aria-hidden', 'true');
        question.setAttribute('aria-expanded', 'false');
      } else {
        answer.style.display = 'block';
        answer.setAttribute('aria-hidden', 'false');
        question.setAttribute('aria-expanded', 'true');
        question.classList.add('active');
      }
    });
    question.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        question.click();
      }
    });
  });
});