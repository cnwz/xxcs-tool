/**
 * @description 核心引擎：加载器 + 框架
 * @author ls_wuzhen20
 * @since 2026-06-30
 * @lastupdate 2026-09-26
 * @version 2.0.0
 * @wiki https://gitee.com/cnwz/xxcs-tool/wikis/开发/core.md
 * @license Unlicense
 * @security 本文件不收集、不存储、不传输任何用户数据。所有计算在浏览器本地完成。
 */
class Core {
    constructor() {
        const script = typeof document !== 'undefined' ? document.currentScript : null;
        const src = script?.src || '';

        this.version = '2.0.0';
        this.lastupdate = '2026-09-26';
        this.releaseDate = '2026-09-26';
        this.releaseBatch = 'dev';

        this.mode = script?.dataset.mode || (src.includes('cdn.jsdelivr.net') ? 'cloud' : 'local');
        this.fromCDN = this.mode === 'cloud';

        this.repo = 'cnwz/xxcs-tool';
        this.cdnBase = `https://cdn.jsdelivr.net/gh/${this.repo}@`;
        this.wikiBase = `https://gitee.com/${this.repo}/wikis/`;
        this.releaseBase = `https://gitee.com/${this.repo}/releases/`;
        this.businessUrl = (typeof window !== 'undefined' && window.__BUSINESS_URL__)
            ? String(window.__BUSINESS_URL__).trim()
            : '';
        this.domain = this._parseOrigin(this.businessUrl);
        this._businessUrlPlaceholder = this._isBusinessUrlPlaceholder(this.businessUrl);
        this.localTimeout = 3000;
        this.cdnTimeout = 15000;

        this.cdnAlive = false;
        this.handshakeDone = false;
        this.backgroundInitDone = false;
        this._pendingAddModal = false;
        this._hasUpdate = false;
        this._latestBatch = null;
        this._latestDate = null;
        this._latestChangelog = null;
        this.manifest = null;
        this.modules = {};
        this.moduleClasses = {};
        this._moduleClassPromises = {};
        this._libPromises = {};
        this._itemsCache = null;
        this._modalOnClose = null;
        this._imgViewerKeyHandler = null;
        this.loadedIds = [];
        this.currentModuleId = null;
        this.defaultModuleId = 'multiqrcode';
        this.inlineModules = [];

        this.shared = {};
        this.data = {};

        this.darkModeEnabled = false;

        this.validations = {
            departmentPattern: /^小象超市-[\u4e00-\u9fa5]+-[A-Z]{2}\d{4}$/,
            warehousePattern: /^$|^小象超市-[\u4e00-\u9fa5]+-[A-Z]{2}\d{4}$/,
        };

        this.limits = {
            maxUploadRows: 50000,
        };

        //this.logoImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAXIAAAB0CAYAAACYCrmgAAAgAElEQVR4Xu3dB9g9z1UX8KEoQUUsCBYiklhQBAQBQVpAEwggEkR6SSIYQIGAUUJRQaUoRFpAiIAiloAQQZomKgQFNahIBI0SpERQsWBX7M/nl/m+md/8d/fu3rv3vrfs93nue++7ZebMmTPfPXumvVLZsBZetZTyf0op/6/+/ytLKU8opbxdKeXXllJ+cSnlNUopr1Kv+8+llH9ZSnlJKeVFpZQXllL+QSnlp+r9r1w//7v+v2HDhg2DeKW7Xxv2BbKlR+T8qFLKe5VSPqyU8tb1/7nwAPjnpZRvLaX82Urujkkf/m/93rBhw4aHsBH5YeBdI1iE+/6llD9SSnlM/T/kDn7nE8RzD0HngRD83ZreN9X/48lv2LBhw0PYiHx/CKUIezy6lPLlpZTHV3IOMSPepXCvT0jd59tLKb+7lPL9A+GbDRs2bNiIfE+ExN+5lPLnSyk/r/6fuPYaiPftgfA/SynPLKV8bvcWsGHDhg0bke8BRI1In1JK+YpKqEgXuR8DLaGLnT+16QDdyHzDhg0bkS9E4tQfUEr5c/U3Ha7lhY8BYSPvn5ZK+SullPeso1vkvZH5hg03jo3IlyHEaZjgm5ZS/lcl11Mh+X19KeVJzdvBhg0bbhgbkS9DiPMZpZTPbmLVUx2bzucDh3rwIfM/Xkr5Pc1bwoYNG24UG5EvR8j8PUopf6rp6Oxj5Ih7LHbufp+hc3MgXQT+20opz9vIfMOG28ZG5PshxPlL66iVt+lGrTjnm37/RynlB+osTsT9+qWUX1bPIXPfS+vBfdL/kVLKry+l/LuaRrz+DRs23BCWEsiGVyBkjlA/q5Tyezsv/N+WUp5Vif5lDckKi7xxKeXppZQPrMf3IfO8BQjx/L7NK9+w4XaxlDw2PIx44EhVqMXEoNcqpfz1StL/utGx65B2vGnfT6xE/3MaQp+LXG/NljcppfxQk+6GDRtuCEuIY8Mw6JA3jMyFTN6sDhH8b9VjRqw9uboe6eq4FJZ5QSnl1fcg83jln1lK+aT627ENGzbcEJaQxoZpIGeEjYyRNPQE3uOn11mbv6uU8uwaGpHOXEhfXj9cV1j8r7VOybBhw4YbwUbk6wKp+iDkOWQa0n21Usr3llJ+VUPOc5HrhXa+cYuVb9hwe9iI/P6RcMjn1HHhCZfMRa5/TinlaVt4ZcOG28NG5PePEG877X+f8Mo/LqW8Uf3/3MMrU3Z3znL3mCoHXFJZxjBWxmso25oY0xMcXVdTmV8yEuIIKDIfZc4nyLldMe1jIKEQy+A+f4/QSsqk4/RXl1J+sN5/H2W5JdBx7GbDhilon0e1k2sicoSoPHPj00Nwf7xhRHgKMgyRv3uNcS/1yCH3vFsp5VuaNM8VRujoF+jrif512HoonTPSbpRDh3VfDjBfwFyCS4a3xZ/VlS9tzLDXOeidqrVBNu10qA5OBTbwM6teek4l1385Npf0mV4iGFtLukjssaWUX1dKecM6k/K1q6ITxkAWZkP+WN1e7Z+WUv5ZnX3ZKjzEfkxjiUwfV9dPWRojh9zzsaWUL2jSPDdErj9Wy4voUlaN4OeWUt63Lgp2rg+jyPXL6zDTLNGQtuTc6zR1sWY5EGKI9JiIzO9YSvnmStp5y9OOXlxK+Y13V98/ovtjtM8pyFee9uO1o9fPqHpr5fFA/011ob2jvSknw0tES7DK8eZ1u7V3qRsfO78EptILS/y9Usp3lFL+VinlpZ3ipZmGtJbRpNFoMO9afy+VPUSeWZ7nTuRfXEr5yEZuSLnfr5Ty1WdahjTEn113brICpv/jcaYMtuf7LfVYGvuaOEaaLWKTNk7xsEq5UtZ/Ukr5NXdXDyMymlfBocqyy2tCev+hlPKd9WFzbL0MITbxV+tm6237jX1/WinlU49p02sr9hQgM+VRmG9rc5se/1Z3V7wczqdSh8rZVrh00hgDCmewJusg2b9TJ/kEKku6bT5LkQZjvRSbLZNBWkPyTiEGY6OL33FMgzkQkeuLSikfVUMojgE9+M0j/5ozLEPqJESN5MiXRgvqTh16w2MrY2GXffHvSylfUkr5C1WeNdNuEbsMkaecCMv3HCJP/X1h3arQ79T1Wkhb8TbN6/0XVf+t89XCtUvb1i4ok7kg7JldD9n0365vMHR3lDpbu1DHhkoiMwW9bQ1FvEVVjk88hp6U56BNA3qj+/FK6n+pemP/sWlMydO9SWcXpK8c7jOl/x0a+ZcijYQny6NNQzw3kJGsl+aRhwDUDxIl4zGIaRfYFTneqZTybSvUs7Sk0cMxHrQ3RE5M7DLfL6kjpMYQOeno80spH1PTO4a+lN8D00blv/8e7CZ6+RV15Jj8U/58e9s3EMHEvVy/KmRySsjPpyWrnvRamZxTaN8xWh1MQghmQ0IMecggD4W8Y7w+qRjx9b9WSf1vlFL+TT2espAl5XAsx1N+/5NbpX9VJYYQ2T4IqfBkebTR1bkhjeySiFx9qXvyWbb4yZ3c0MvZ1vk+aO2nBW9PJ/HH1/1bj6Wj2M8hoZXIFiLntbY6S1vosUt3/X2pC9sgfvAOneiD0Xm7OpHWNDlkCDt6gujuI+q6SmRYvW0OKXJtyENBQl77IJVDSX+xxtz8n7RPgcjflsdvsTkxum+tXhJvZWrUhXvc+5b1VUxsP5W9L2LMX1mJZsqY98WUrvPA24XItSaRu4dsQ5hz/xTSGJVN2Mo+ra3MIZ1cd2xER/qBxGT93qdNkVeZeNUfUsNAbRn8/u+1vZnfEFvPt05qIZ4ezvOODRpQx9rBMUMrkHSRpIXqhuwmx760lPI7a5tdWxZl17HpMwS68Bmz1YNwlEQrGIP0W0NTyXr7EbEOyUeXUn5+7e11rVeQn6xhDGt4e1UR//pP9TXvuaWU1ziiUcyFSmtJPdA4rBH+90sp/7DGSpXFKBn6sDKixqMj7O3rsUNJHKIPXhpvbciYzwGRa00iPxbUTYjLWxNCa+V1Dsj9tdVuncvxfaD8SMZyC49p8od4eWyLE+B/5/bJL7qla6GiNWwQIqM2a+0fxKWT76O7EUqu+0V1BEyQstKjN17ytGVzjpz4gleb61Mnc4h86GF8KrR1uTqOkXBP4JZo1ZvLOK30ZzMG18yFpWCtQ/LWlcTXMrq1oIIYpm9yzdVpe8+hiGGa4q/fYMiY94XykNPKjr+9viKnjMrgIfw361uJenVsDJFrDSKPXO9TZWtHRZCDU/Cnq7eZa+eCHOQRxhOuMsa/lTV17johPuXZVfZdyP2Gzho51S9t7JxrtCV9NZFxH0S3dEfXdDdkh/IeOk6uobzJyFlrZxm7P2UA/8vvGyonpN6j38S6H9XVv3Pq9A/Wh0Ouz/cSIveAcWxttOXsscT+FmMq46WQVoyR0Lxur1Qav6doa5Qqry1YK0d7vDUC6fq9pszHADl9IPLSi3L5pBxDDWRfpDEcY+GspIVAvM6TX3kgjWjuMro5vwaRx9Y8RHR85/7Ymbc4b399/8UuJN9fUMmGA9HK2ULc0+t6liDeF+RTFvnoSG/LA/lNbx4c4uRD9UuGoeM9UsZjEjmPPHXR6ib11g/Xi47ZEXvq6z//I/k/1Fyf7zlE/mV1VJcHgmNrQ9nSNnr0Mq0KSl4DhJeWShEy+cN1P8nWEFXmVEHH4L6Qx1ryXhPSWHgZx5iirw7V3+NqHwCPPHXIOHlOn15K+ZSRRtQi59ckcsRnxE/IiD7EKb2eW01yyTZ4yZMePRB5x62M0bXXfw6Kzq01dB0dIyhE1eYZ2/+uWk7npsrjWufGzkPKeczQSjr9+jbrf8eFiIwxzz0pcx6O6tCxwDk2/gfquOxcn+85RH6foZWjolfyPogR8hI0ZhNSPJVVkI/za+SzYRhpCN9Xt5AL2Uw15CVI/SIRpJn8IA3iPj1yk7ferrk/5TdRBBEbez1HHymnNW/kn9EFjgdJ+8+UUv5yKeUXVnI5BNLzcHzdSuJ9Z1n0rdPQ7EGTkcjVw3Ue4kJc0ptCdGf2s86/9OEEZPJg5JS9V2dTvulU2KqH89q+fqE/OqDzpCFEiuzpL2lG18JYhjymPoLYwz4eecrrjdUbVl/eQyEtaUrf21TqLGVzzugdHcix0VUhk0MQpYmHWbnPN+UT1LkNx0cMWUM3zGvIkA9BGhSyRJoxUkje90nk8chzfxoPshFa4T2HQHYh3p5rfdZs7HPQ6nYpcq8ZyciwneewFKnzQ4YfDiF1ZkasKetB6sw5IVkjv3JtEHvYh8iPjeRp795PaGRKuX6i2uLRZp9KdF9EeA3PK4s4of9V+CHpbliGNC6epLHtaYRrIelNEfl9hlaM47cmSE/kCJxHvovIc448Oos1OuEiZDMGebUkMxdT7YIM0cUQ5Nfn2afnPI8Y2ek03KVD99NZD8d45IdMCBqywchjHZrPa+o/6dp3VkhG3n2d5V7l+uTm3nzPGXorj9jumpCnuLv5Lc9oZIot6qcR5mOL3rjGbHFv9IYwF1EWoQmvIgg3ZBQbjoc0AJ1LXpMzTnVNQ5lD5PpEeLNTjQhyfk0i9/AyPXuIyHlBc0IrziNA+pOm+5BVm94xsVYe0YFFx57U1N1S5L61PfLUwwvr8Nukm+941UNyxx7+ZCnlwxrbybcHg4XYdtnNMZA8hZOEliNT6vUsPfII7ano6eg3xe+T1qWA4lMp51TOGIzXOSsKHsOI06imiNxwMCGJXfnn/JpE3o9+SD2JkWs8Szo7U1bTrZFVm15Apjwwl0A6+pGiuxbKsSuuPQTptXJEB5YytqRxyrMUuW9NIk99WRPJ2iMtkn7qfkju1GHfJxIb4lQ+a4bdBNIbqot9IE9vEdqgdZ8iU2yHR66/gU3m+L5wLz0+hKXGGCUZ4G+JTr8pc2k6lwRKU74Ykv+V+b4RI/G095rrOzKuiTQqHhRPKo0ZYrBzX+Vzfg0ij1z9qpHRixgxIjcRZa5eQjZDHnlkZff6AwxPnJIvcC+S/iV1qKRx90kzMhv9YhSMTsBHNNIO7nONV3SkZlJd6iTpzSFy6YwRmfvI/MSaVtJNPnRjeOEUlLEtS2RRt4Y99vVlwStpDsX287/lqOXdTghKOibZWcxsqszHQmz1VDFydSCNu3QkOhdRUDZAUEnuX5LGpSGGq9fZjE0jC4wayPH7RIzFBAmdP8cy4KRroSaE05Y9MjyzvlbuIt+cX5PI+4klaTwajcaz5AGnXMo3ReRz+wOCyGk4rhmgkROS5twHIaQsiNzMYevtp06S9hwin0LuW8sjT3pCYEJh0SnM0Wvuf++6REfkSTpLFqWK/l6z2vQcu9gFsvC2jfEX0url83Bi73gkx/fFj9ZZ4w+VMcrchSiH0RgCxRtJpV4rUj6G99RSystqufUJfOg9lz95M1ydcowoBro20oimJgTNnVGa82sSOXJEkkkrjUejESKx7sdc3cTOp4j8M2pYUVhjSr5AGrxbwxV5jSlnC+EG7Qo5y38KZJGG/BGqWa2pk6Q9ReQp45vUUEC/zgrIQ/jIhglkiw7ybccbncxDkB+StKDcsxsZdCBbClq+kTfpedjq4xmrq6QhTctWp5xJh+7IOXRvj7b8CPGSEH19XW0n7O9Bmf2ZgxSegXjdahvgNSIGYvcga4WHKIEyTdv2KhyDOjWSr9XerPo21GDXQtJGDF5d2zLHDszgtQDYLvLN+TWJXAeZDUWSVozdmF1xyV1rVLfIdVNEPuU59oiMxi6b0NMi5TVcUMz3QYO8OzuOXLevR55j8Y5z71qInsyi/PBK4Dxm6wA9vavz/HbcOOsheVMn5kiYRNTWce73YPWAnVMnSS9E3ud3CKQdnuixVj7KrpycSfMZHpR5LNMWUa6eYj3GbUVcK1LGhAyMaOBVxVAMJbL+C68oRnUqqAt1IqTAO4lhHgsp81RowKQStpFrx5DzaxB5zpuYwqiTVuqDR4nI57xuB7luisg9sIRCLIA2JR+4TyeYh62ZsS1pprzeZpTBlnFzGrs0pYPIecXCfUk3ac4h8oTK6Cky9ZDX2Lk+3YBOtAv2wC7Ag9YDV17yB/enDB4q8qLrHpHX8EIrNaaMqRdvFEh+7ozmXHOJHjnEDh+aN0IRU4hyrZXyPbVj5dTEdR9Iw9DBp4OqbRAxBI1AY4hhnQLRvV5wG2qI288x3kMQwjQsDCHFkCC/NTArBObaMeT8mkRuOdWnNWlFR3TyBnUVzbk6ynVDRB44H1uYA/dKZ6jNSJu3itD8XgrlbdONDpcQOQdFuXfBNUPXSauVXT3wwuORC8l5k0sZyZtvC+J5WzF+fKiOImtGTLVIWb+8OplDZR1C8pki8n3qAobqOFgrzdh59PugHfQX9Yhy+hXHbgWe9P+oM7IQSBbMP6VOYrzCOrzjucZ7CFJe3pU1MNry9vLk2jHk/JpEbvywCSZtWoFREN8/QhJDyHXCFeLPPMs1EOI6NqLDOUR+7NBKCNYWZzajFupKPvThLTdLVWdJjx50xot/vfoG5KETPUpDPpwZcwXmYg6RnzN6/T5oB1PG5Rxl8caRmfWDT2WQ942Ukycghtk2iBBIP/j/2Eg+p95gOfkIAXxOV94QB9JAHkPE0SJprUnkYqOf2KWV+tO/sWT38tg879HaNUIzQx6ra4ZA/qH2MXQsIPdYervQp0uHHj5GlRnJM1QfKaN1TmxQsWtMvDSMukAa6jn1lAeATm7ru2TnHWmTAUHr3Ex+x0Tkn5PPFJGnTBy059dO215/Q6APDxMht6Hwj8lpwqBW5GSjc+R0n7c1cfB2k+/Y+WwiT0PJpqIR7hYQZQ1tqZXffSfbMZE87EJkzPRcYloDKa8JP2ZvtuWNcZkib82TIeJokbTWJPJ2YlovlwWMkMwuuVrkWotFWRmQt5gGee6IDmMnS8o9hui5n+ySvMaWTg6BGzdvfLX11d3b6tH5OfK5R322cK88DcfzpvhjTZ5TSNsZIvKUyYAOwy77Mo0hOlpzHHnk7GfBJu3ZRJ4M9baLY6Vx3AJSVv0CtmKD6IpCTdzwyt5OxjgWUoHyU6Ge/KnkUyBGOhRKiqGK19sMYZfhJ601idyIBw/bNq3UiXHQPKtdcvWI7dsExUMKCQ1BHq7lafFseWMZm9y2rTTcHMt5s07NAfA/GXPdvnA/b1jIwjT9lGMIzskT6Ka/LufplGfobcxbWfSc+jJuWl7ybXUsPf+bd/HSOnTXsVYvhyLpGRoshDNnhFLOTxF53jA9xOfYDX1MzexE5AZILJnZSU42NTaTdRaRp7BmDCqs/9euhHNHFKeh6SNIo3U8fQa55lgIIekUQuKW/pTfHONaCw8MpXZmftCAkfo2OUTnYOxmDElrTSK3UYCOn6G0jLR53oy0hrCrLJDyGznCTnQI9x48WdJ+fAepW28TXsnn5HcsiGG3Ha5kF1JCQNFdT1LR8S6PnNNjmKTQ7K4wzj4gz5I18aPnKSLf1yPvw62xg0M88oOIPIIJLVi/IDffGtLYrO5ocoOnLuVZnKdtrMdA8jax5TfXeONcw1oTyZOHwsBjUCn/kvHasas1ibyf7QdJ10QuO9/vSmsMytN+lA0ZKbv/eYG8VGTm/xaudR2ZjDISQ7ZCaIvUccYE917tHEQ2eSFf30hTaMgQQMeGEEJxL0LTMWwoH9hL80WllN9QCV6ZDyFyHrnp9f5v20x0tATkbdOIPEZUmVexq67dL9+bIPIUQAWZkp9EbhFpbC2Gjq2JVDS9ayhinrsM9FiI4X13DTPFFmKk1jIxg3LO7NKUYQ0ij41avlf4pK2TpDt3xmkPaacs8oD8b7ajjivkaxNkCCG5L79DOGYjIhhzEniMbVuKzOK7ZjbuWhfGufbjfp/c483AwwvhmiXpAZv7+jRzTP7eptShtMAx8yTItIvIf2udteq66Aqk7TNF5Gsg8tgPwRvjrrpWNuW8eiJPRrwHFSxOGIO7VVBiyu835R0LaQDym0tqx0JsQbjA63E7HTzfZr8ar53X5ikjTTnWJHJkaoq2fGPPSTfT6Xel1aIvA4JSPrFyTo0NxHXgAR34SN936k0awmAeJO1CTv2SuxBZsxRwG5dNeSB59RAWEZd/3/pQ027dp09lamGrlJO8hloi/eRLtrlEvo9Hnm9zNIQN27DOGFzv7YL+PUyTRuSZu7FEbPfqiTwJqFhDiNwcgTYcF/RM93RusL/YbxrSfSBGhyx0oGmUsYUYlk5OnZ1zDDQGvwaRt3aKiPwf2ZLuQ5Mm7u6chvCG8hi6KLTgQWFcufQDacnHMXL79r+PjjejFzQ0oTjEjIB0mIrXt5tgQGR2H+LVcTqmS7aAxCwQZQCCfhNvScI24B62Ik9OmOtgKL0cI3uIPA8Kx3YRuWtdZwy/FSjboXrS9iATqtHZyXZaIs+9Q8N7x5BrhNGE0yJHvjci7xDhh15ZNxwXqaR9QwJrY47R8zgtBjXH6FOeNYg8DQJB8PiGHjJT46l7JL9MfEoaIF3/Szv5+rgneSJDI3vEavVrpFzS5IWbhi/0ketbpI1pmC+obz6WajXW2/K33oodMzEGkSPqFmSTLnml5Zs8tk1Lfr5b5Jh89yHyMSS/jGTyAPM2N0TktuhDVO1byBiUyQPRglHi/5Ej3xuRd4hQYoCMLzduOC6i57m77ZwCMWRELQ4aY4LIa4o8Up4jb65Zk8iNWOD9Da3LLa7Po57beECYxj28aWlID0JykRd4nFaEfE4Nm5A39yA/3qj9TM3FkL+Pc2ngPcjt/NC5Fq5LGpHPMf/nmEl8ZiaPITpx7X0R+T4eeb/aZb43Iu8QoYzM4BXmxg3HQ3Rs4pWVBFMH943IMTSrM78Zrtmmc2TONWsQOaRRWBXvzRqCyLfJIsbvGgc91YDSYIU9LOLkd66Vjk+A4I0g8opv/LSOSiCvPJCe63W8idHzqKXnnA/Z5DeEluj8buXN/fkA/US+3Cs0Y3VOxCuk4dhQuXPcvYcQeWQN/HZ+I/JXlPdeiXxoxtyG9RH9Ii8kprL6xnFfiC0wGqMhWluIYWVCyByjT3prEXny7Nf6TgMyNBKRiz+nYQwh6RgCaIRJ0gl0yJkYZwim0If1PUAeiI6c0nYPOcwzQILkyHFpksExchni1yPX53fgPp8xGO1CPitiCicZ7riLMHJeuocQeQ9pSnsj8leUdyPyK0d0+23Nuhcwp6JPgRidPRYt3B9jamHSmHVJYnhTiG2tReS5xvZrth9s00sjMsoByY01ysiN8F9c47U/XokMyRhZYYavzRQC17gn8gmh2L7MzFf6kLfz8veRb+SyiwxyM4GllXcuUi624oHBdgxK4IkHyhoZxpC6Vf59iDxyGLVkLZEc83GPUTTk0gkq9LUR+T0R+RZaOS5SMYzd6APTtVN554AYnEXTeFS+Y5j5/leVAKdGWrSIba1N5AhUR2ObXn7vmhQUnYuL8yKtbYGcMjkGXON+hJYy+t/1QihWfzQFHdLw3eO3bx/eKRI30WZoJUmQttEm3gB42Txr/3tIeCCFAAOLKSEjx+jfR5676gFSX+7dh8hTX/sMP0w5NiIfR+Q8mMitG2Ex99y4YT3EkDVWCzshyrlGcypEHvLxSmOUEKNy3ENornHGttYi8sjobcakqZbokrZlbjklc9ILlEc6fX0gJeRtLQ5jypFf4Nrohxxk8z8y5jnrEAXXaewafWSMboVcTMwRd5e/j2ts9tx68PlWLuUL2S5B6kwe90XkGbUij17XPaRPjlsjcou+mUEc2ZL2Q4MMJNojwpsWLh7YNo4NhyOV6BsB0fEu47sPRKapjk4hDeOI58qf69Yi8hg78vNm4540nqQn9GDCTK4dg3tc7373+p+XbR0Z48l5Rbz2eN4gvbSP1Kvf7jXT1bIO3mqFHtKuvCEg9eSVhu27JXLkJi2dqx4chnkmr5TN+G0PlF1lG0Lyde99Efk+HvmtjCPPdd7kzGmIzpI2u9I2H+Tt4h4pKINSwQoTgTYcjlRE9incZXj3hRhxv0s95PcH1KVe55Yh161F5DF2QxCFIIyzjsG3jSgrz001opwTQuLlaugmAmWyTSD95JH/oxdpmBovbKKMvPHoUXmsWyQM1Len/N975CB9I1+0xYyVB9eL2xsrbnTOVNmGkOvlMzRFH8kJ3RyDyPMtji6U5ZrkPQbpq0Md0hyg5B95ronIc4381XvqhuxJ20Jr+jAf5O2GHklE45BIOy17w2FIJTBG4/TnGsqpERvQKccGTEyJUeZbWZCIjqw0jl2Iwa9F5JC8hVbaBg6RdY7nl/xsG+e1NelI20c6PpD2kDYhH+PPEbhXfwTr3ujJjE1zMnhW/s+5IHL2RJ58ne9jpfned/JY0nWf0N5jan6OSTdj8LN58ppEHrjesSXodRd5rpHI7eNqCKnvpJW0xcfFyR/k3SqkRQpgWJlFcVLADfsjjV8IwPTquR2E94HUv/W8GXRkh/w2UsWEkxjYnHLE4KeInJdmHHSu3YVcZyKVRanaNPN7zi7rKUPW3+eFut4xZQbytW3Ghr+m3SORkIJr6Mf91j2xWJZPZi86H50F+X+IyCNzP4qstSdj6IVg5tYD5FoyIgtevzQd9/HbQ8LbCYytR76LyIem6K+JyHNNRB4ZtS8hrhapd6Fve64+kHFMqRFsaNH+DftB5akEHTxLd605NVL/duo2Qamt//xeMqMzyLVixNZAadNNIzL92oqBc/WT6/o4MiTNXXHypKFTSd0gYW3D8baNuMYbikYu5GQESpaJFYJQx8rkPiNNEC9PN+VIPuRo002DHyLytlEbBun/XJ/yPeSd3aU6DfdLh7fHY7YkQNKF/KZTzpzOVg+k1Fny3kXkFhjz1pYHReoGnF+KyBdEnmsi8qSXASeRK+mxOQu53W1a3SslSGG9OnsitIlsWI5UbDYR2GVs94kYmldqXvdjuwYYo1pKuJBrLTkqvh69QPIQHjHtfW66kdca3GK9PMDYar4NJWTLP4GI6CYAABmmSURBVNzYdovkZZEtG1W0DdFkIoRtxqft7IQhcr/7XKdhuZbXbYKUPUQRhWMpl98+7kHY7drkkXOIyCFlkT9HIHWQtA2X5JXbWzPX7kLS16+AaMkeOcBv+SgfvYr3C+0kz8gwRuSQPLy10EvuWROpq2si8uSbCWpJL7png+zZNQ/SS6UNIRmKLRrDeoxKuAVE+da+EHPcNV38vhEjGhrSF8O03ZyV9RjokrIk7al4Nq/YBKS5jQgiQ090kN/GcAvp9A0991rhUZxb2cSHkbcRA0hM2CJwv/RC3mAhK+PJjQ/34HOc3qRNd/Lz7eMtR0hGyCKypexjRB5d9B4a5PdDoxjquSkkfQ8ASxxEhh7Sd21/LvlmPfLI2CK6tQ6Ofg8hq7F89kVI7lqIPOdNpBI2G1qyN5to3Mk3pdAI9xGllD/RFHLDMoQITd1u16Y+V0S+bO3W1nt+a7gacEs2S2Bn+3Zn8Biqbw8IHseStGOrfRwZIvOuMe865XjJGl0LcmScs3Rzv45gcUpvFvoSskZ56ratZ7+la9w3wnlK3XWqb/DeHBC5maVt+ZMn+ZBPhgq6BnJ/3maijylEvqEF0cD/0pdu5Eh+kOtj15b/FZIaqzMyGTjhTW9I//tCWtL2ALZL1Vj9BtHruRJ58jTJTF9RWy/5nR2l7upZomNIhmJnvEkxrgi2YR6ieK+eXkHbxnmOiHw8KHWeNaZT534jNeEHRDSHMILYE8LU+cUDjj3lW2gAkc1ZK6RF5DYqhBfd61g66sEyA7zuqXpwnQ9SavN3D2+bx2+Het/iywE9uIbc9OS3j+O2XNMRazy5NL0dGGPeN3jl1+CHdgoik3T1S3izyL2gLPLiyfN6hYNy/RhSd1MzuOUvbWn1iG3nTSc6JXeud3/KBlPyrIHk0+qtR+Q8VyKPfDij3Z0taRkkYW7DQ29tKfgYIqC4rs1lhyp7wzii/Kz3caf4M0Xq+9PqUrptfbeGxGvmNe4yyhYpu9ie2DskTcedF6uVtv+XpN1Ch6CJLEkT0hiMeedBjzVQ18vTxwNH4xN6QI4eAsajt/YvDdemocnT78jO00XgWYvGQ1CYxsYTn9DoN7JqnLxtnnlf/vwvDWGfsTJamdH659JwzjVDSF0PdTyT0fK7HhoeuM5JK3m1IJPQzHPrBCV1OJbnOSA6QeRspbUDv71ZLO2niS4PJfLIpo3QaWzDPZHNSEL9DQ/VrQumkEx55QrdTrjYMI00rENm350SLVFY5c9oCzHb1LXy8NCVRwNfWp4YOyLV2Rn9QH7zgnhDS9OGNDozTTUmr9pJX7mkKX/e9NBqiLnfOHajM4ydR2I9pAGt7HSX/8XOjWjRqDVG5+SVxivPfiPrtCltzINjDJHRvdLIfUEIhB6FvjL6ZkiXqe8Mt5SutBz3RiAM8lo1HmuZBmn4kME1Q5CGPgUPE2UXIjNBysOfLKeAMpg4pC9qCKn3c/TIk9/QaqOpa8sT6Dx+SLaxCmmRG55cFx9qE98wjih+qlf/HEFOdhHCGsKUMY4hxm7Yokk3rR3lt3XNNYRcuw+mZBsrW+7xEEOmPCL153jqLCTnupyTXhorb9oDShjFcD7H3APSyL1i68iuDS05Ly3Tzw1bnLKVnDP5SOdqq0fI/zqUjSwa6lzP/5YbQLYZehiiNsDBCBXyO66fTN9DJqbI37m2fI5Hvy0cJ0Ov82NAXmLwwl4eJkN6TNnN4DVnwe/Ab6N3eL1LZsvGXg8lcqBTfVNGX0kn+vTNSfBWaQeqh9LJRbsgcZWcdZ9749nwMELiGonxvypgVwVeCvYpR+5BlGLvQhTREYTIdPCYGTnUAOdiH/mSHy9WI+Y9tvZNVmmGvPyWD0/TWjkI3Kt4VkyUHrRlSB5D493Tnp5Rp/GHGIaQ8gn9GN2TYWjJE4RGvIbbgFmYxWqKrV4ii3N2NooskSMLjWUSkw/SFw7yEM6yBY63egFp+UB7/NhInehnEJ5CnvvYwj5Ifa1B5LsweL+Dc5Cb7Tmos8iQmNYQNzyMVKRpzYx/qmHeAkIcRo1YWyMGDvnNaxMfHxvrfUwkPwSLaBEhmX36NqJvwDBHb1lIUBgiUM8tkbWIDoZGAwU6a43o2VX+nBeGMXXfJhX0mI906dOyAEbyCDO1BBB77GfDRqb+9d23/NxvvD4yN/LGXqKpv7bc5HOszfPYkDc5hXRsSL0LZOv1H+QBNRfR51pETi7XDWGQR8YuHkIq1ZAr3ge4f0kat4JUoFc8DS26u1Wk/EPhgBAF79IY8jmGviZCiun8Sv6xayNoHFePCNzvdq3yNLqpxp80EZ83knbSkrzJgMAR+VyEPJCutxj5S09a3hLMyjYOOXm3yDHhBys7ujfki2w8UIWK2ntzPoQuhIELhCd49gi+h+ty/bFBF2QS/hVfPmWbW5vIF0OiSxCBKUpAvjWADS9HGqYxrRqEBZSOUnkXgpTdW5wdeMQm2VBsxm9hgIdWc6vnToE0eMMBxYK9cZqGbxgjcvVbA2wxh7xbpExGAhkRxON3DFJ+C1JZz2RJ+XNtNqoww1N4xoxb8rHDnkhzzBA2nX3K4n8foRQPgSc01/Vw3KctuzH03g50inowsHtv70Pb2R0L9EAfOrstr7xEj4cieRnpo6M89Us/vm3AItxzNkQOEdrWWhSmQmM0G16uD43Da7r+hFN6BueIlL9fdAkYdAiRRyymO0Ygx4a4vViyEQ89Ql7k7YlxF9JweaweZEaCpNz5lqcVEnsveA6iL94xYhbqofPI2iPt91Prhhepj3x/VJ0AmGNjaNt8b9/yF1M390S5LZilQ1Vs3cPCvWtDeXnkhlMunVB2KKKrKY/c/IijLZS3r0IjuMV6svMJpanAW0cq0bh7DWVXg7hmxGiN1Pi6OnyRLmJ3bEbjFlbhVR7FyBeCDLHjkOEhMuVBJi4uHm1LPzYBjtON0SpsZV/yyX1k97sn1iGYGejhmTHr5BRXN/xy6QMl+eaeOflfE1LHFpjzydBXutDBLzwnBPaI0SZrQaL7IgTlNcy047wyq1CfW4UKVYlL19W+ZsQepkjqKAa+AGSU/7FkSGMfQtrhIXlLf+5DR34+Q/WxVj0kj3xOBTpeQ/6LwqEKDknpxNFD/o7VOHwY1qHpXyIYkXJnOvhUA74lTNmCc0Okcm0Y08F9lH9MFrg5IlwJ96bTqYx3Ia9SISn/i68JKWSCgXO35KGHxD3cxFx1Pin7qRvphg0bbgj7Enn7Gqfzhmeuo8j/ZqwZu2pkS3qt46XLLw+Aa0SIXKeG4UZLF3/asGHDhsVYSqiuR+I8TmtR6KUVxAfbDllFzXKhSBvBG85lpTzrNoTkwG/eetK7FqSMRx83umHDhg3BEiJvQymmUhuipIOzJWgw9lbnp44+Y6nB0Kr3LqU8vv42IeIaEV1YKMhwo6P1Um/YsGFDMJfIkTgy8v35dQ3ihEviUbehE+C1Gxdsv0TbZJnRxkM1BM0qisaYWnVNXP1aECI3AQCR3/pkoA0bNpwAc4g8nXUI2Fhg03EtKoTAQ9otMvwnY2VbWBZVLN0C+0iOZ24s67UgRG6ssNCKiR4bkW/YsOGo2EXkIXGztKzPaxouEjfIfReQl3tDYoh/V36XjhC5kAqPXIhlI/INGzYcFVPEGhI380xHJhIXLhnytOcihNYS25BXf6kIkdOb9SbslhI9btiwYcNRMEbkOc6LtkC9dRzmeuK3jpD5PrvBb9iwYcNijBF5yOeLamfkRuLzQW/0l00Srm2KfvsGteRNg63F3jzstnDT7aG1nVu0gSXlX9Rehog8JP6Bdb++Q8Mpt4boy4YSNpa4NiK/dWiMxw4HarTX9haHaybJaMP+6Ik8yrZ2ivWYdXL6v79uwzhC5NZrtzrkpRN56xVYgpRtOOZjnkBWz5uCe61HbnsyMPM1HcHB1sivG69eSnl0fYvTJtS/bdnYwDXVvfJwhlson2PKzwlwjfIbFDHkFNCR5X/NjHet1RSNhJNGqyu/Hzzw+wYYb9wehHY737zx5UhoJRvYXoOhpgw239WB69sxe1zaxzV2MwSGyjDNJ3hcPfbFdS7CJT3kUo53rZPbzIlwbO26FcLUL0Wvl2Q7dDFESurY8ricGhtTZ+iy3ZCsn845mArROTd1/tyROjR5Mm0HDOM2v6ZvO/nfUG+bZ8POJbFbIk8C/YasG5ZBpdGrJ65dQS55UhC582EPbMQkL+WC7GqjMQ4ZWO5DTnbaeUw9/kl1N5X2vnNvrGlEdvix088xnJzYDpt5g7oueB4gl4rIj1NwCzy/lPLOV1C2FmnjvG47XbXl8tsbieVM2DzYLvNH6/8tN0jHZu304+0XvrduyycNafnw1l9Ul0V5ZTcFEcRTwnK08Sw37I83rjNaL81gQ1rWyeENtAvlMy4GxV687png5XrnWntRXsdy3Ho7vunCBsYmS+V/E8XeZWC393NCdMIzsrsOL5PsY28iQ1C26EgZ+3vlkWve6J53TJqLyGeLtyd24QJloTOroX58JS3nvqW+dQi1jZUtdoP0bah8rnYRRA8mOHrTGEIrv/JMYeracLOHgXbzKrnAQSc9BUz8IVAqY8NyRNE6jK07ExK4FEReHbafdSTvExgrG0TkJlCdswcancQjB6+/djbyutyTcg/lRP7Z/xOpmS0Nwg3SEH7KEtDWJLJ58rnqI4hevJ3p3B+zlVY/ytSTU4/YhuUuzMk491nSqafH1g2g2zojs/p+i6ob5eBlZ7eonrTpkBNo4UH4kVLKDzTeu7Q9BDnd2uidRx4hxOXsMxki2rAfYsyfV0r5uMbYLwV5sNsh3Wa+8Z6hfcAzqhghW2KoNuL1+/tqeElYxTVD9/lIV4fph9T9Js+1saYOWyL/ylLKk2fUb9oXL9vDHZC07dZyzsS7l9ZYKrzhhRG5/ViF2Tys1Pmh/CFNtqDsiPwHL0AXQ4g9q1f1q55hV4zcBtrvWY8J1dicfNTOZBLlZFftNDznNuyHPAivqcNzDCkbI3tJ9UhAhyCPddT4LgxDRI6IP3RGGXPeAAIDCSBx4jTcdCRfKpHHIwexW56iOO4S2dmS+LAlsr+slPJq9W1Ff8ElbdJitF94FHzzpi0SSF/KIVxkv4L2OqADZX7Tqgf/ewDYUDoeuWM/VT36u5tSEf2u2hv2R5QttmynoHP2NHeBl+11n10owxCUi83Y7s+wKUB44qDCB63H0cJ9DFks2FDGc9ZR2smQR24Ehk2kx3SErA21M8pHOwOzfm3US7e8TTbiFTqjGi6ZyL+pvtn33uYupKxWRvVQ83Z3SUQe++XAIW2d1uCYj//z20OuJ/FAOvoalB0eVT+upQPwkOOl0/ldjBx44wL1FJWLN+yP6HHsFercEaO07+hbNm8ZayJOgw1IvrQhhXPEEJHHIzfnApkv1VHK/yWllI+sIazEzS+ZyHVmvlsl4iU2r6xCMzrGPdx1ql8ikduTgUd9LC6NnXEGLAVyFyOf6mndsB/SSD01xbjOmaSGsBH5w4hsc4ic3lpPa6wxp/zXRuS37pHHHsCoL32Pluxeoosewio8+qfVt0D4qtq39Koh8qeXUj63MawNhyONOkOEzt0Ix2ACjFidBhV76cF4ldXWf69djz27lPLCGnIYK7f7vCJ+R224aQjniCEiT2jFW1dGrngl9lotTAk/VDsCHWcHOr+B4/SJNbSiYxhRGVd8DaEVoaLn1rpdUp/qX1oeZiYQCT34/1I2Mo/9in9bLRYMGPiaOspEWfZB9KL/QFrWcQK8baOfOyJ/XinlSUfyum4VKpR+dWjwKMTLz5mo9kXKpEG3nZ0mP7CrNPRLxxSR51y+hzo14f3rcFTIAz73XPqolV3DD5ci7Ud6l0bk311KefN6zPDUj62DSQyz3QfKjcTNhv6Uqg/56L/y0HgQI/f6wiN4/aokN21YB9GnZYCt6b70VfM+EaNEWoZ/McIx23Cdc5yBrKfy7XXs65RXRj+ut8qm689ZP1NErozkdo0Yr1DaJ9dr7G2b7Qw/qL4OQwheJ5Z7ronI1eOhMiv3pRF58Lo1vk92BCxm7k01D6elkA49W+LAW5zx5dJ9WT33IFHxcTEdF+6b0akRYjh3WVMBO8eBniFC5IaSefIf420t+rnUGHnvkedBlDdcQOLIHG7BIwchtafsmLk5BDaHoMTIv7k+5KR9aUQOaT/CRBwaQxKV5f1qPWe6/RjYkrf4ZzYxceHKj250njwe/MhroEQp6txA0Hhp5M2TOiC3a3yGzt8nQn7fWUp521bxF4DIaggh2bNI1BR4CiF7w+148VN1wRjd8+HVU71kIlfX9KVTyogLe7aCeLl1MuBWiPxWOzuDcJCyq1dlCZELsSD2XWWJXq1JhMwhi82xMefu7pdZXgNDOueCGMCQTCHuMWKZuveUyMNFR5fwhFehXRV4TiA7Q2RUYw8g1yiPjinDoQwdg6fW9ex3TV+PfszuPGfsInI68PGG+z21XNaUUe+W7YVbIfIMP+R1TtV9D2XN8ENlv7Thhy3UvzajXk3mEVrxtvGcUspPTIwhD5RVu7B+zdvXY19YSvmYRud3kNlXl1Le54yIXOFUVmRRaKMakITONGsvKKBrxCYpSkyK4Vu4x8dQH1AmZRwj/FMgetWI9eT7vcS4zx0xWMZ1azM7WyIH5zMCDL6+hlh4UBrxrRD5rXvkkHahDMqiTGTfh4vol55Hl3+WGYJ8qwMyWROpJHKI2z+rxsq81kcxY8h5r+rvXgus57h/MJwaqQSzHsUNlxr3fSANhidgTWQPzinbCJELkSAkQGIWBtoVC1RvSM46HTzXXfV8X0jjGSNyZfTJ6qGQ2D+Hw5TqWyFyM1TVf6aUz4W6lxZHzJo0SfsSY+QQ+c014NgINZJ/iU7CW3TCMdLhyZv3gLsDxRnzaZ1oifv/vhDP9SfrkpeIL3A8DbxXguORO40pMATOer2WXqVQij01yMMAGaLG6dUxZTlXxAC31Q9fgehkiMjjcbfrFQkVWSRLvee8yRvugW8spbxHk+61EPlathLbkN6lEvnJQFEWXhHHvE8iD4m/uK74ZRJFyNu5JaTnHve6x72eZF9RSX0tI1uK6PZtSinfVeU7Z688jTMr2vHIx/SmLHk4WT8iZdXgdHg6BkN16Jj7kR7iulQij8fdDjtMnFh5fNxrxMEX1PP6Dz648a6uicjJ/JDHuBDsh158S++SiJzM7FpkQCjVGymQe6gNzEXsiJ0ZAWc9lzt9yJQ3ZJjPfSEkbmD746tH/ohXhz3ByBTUxwwoHQUMY4yUjoXkuXPLpjNBjBG56KQhq2M9eJrqy36cQgWMNw9eZRRGEOJCTlNldr1ZjWPnzwGRf4jI6YauOCL6ayAz+uKQuFeo0NsmmAVrNMK1ETlYV91ouH2GHyIqu+yYd4GXLi1GHhnFxI1OQeTse6j9LEW48hF9EBKX6RqZ7IMUkCdmmJZRHVMNfh/kSSZNnrk4dRRyKiQ/65boj1DmQ57O54CUAfFYS8LiPWxJnFsHj3qkd41biObSMUXk0BKZbe0smoSU0rboyqSnd6j/u8/910jkjyCamWhJ8FI7OyMj58ZolayKqa7njFbpIT1vrN7m36kee0Ep5QmtPu6bUELkKl3lr03iQRoTD9IriU5QCqCIUyDlZJTipir4EoySzHng+e2jfiK3jlA96a9T/7eojwcykhKWQWTCDobjeRui+9QFgwZp0U++zxVDRJ5Fi+zmY9CARgu2yOM0uEeZkBlib7csswOMGdVJ15orPLhrIPJbHn4YGduHEeg/8YBfWobo15ucNzqw/6noxV1aMar7QLxUr99tD/WxEO8A0SS+dEoomzKKk5qhdezyroEh+yD34+pUYR5C6lGIRecd3YJOZgtEKWMeBrYRNBbWq7cGe0lIfQ0RuUZl4SyekxUMzeREQJDGZlis9ciV2zWWJaC76HjzyIdJ8FqIPPVJJ0vKQL900BK5sJNlP+70wYh4TTzVU4LhypsBWO5RbPEUlRSjs6cerzEkdAokrww7O0V5DwUZbRShM9xMRTM8rYaoYQH5XSNkZB0RRETH8UIdQ9xIKnUO4uGM0fwAm1ObOCMko1P1XBHbyQYsYA4GOxLL1bFLF8qYFQwDx/RFeWPx23U88JzTUBE4Peb4pRG5LQE/ux7zxmmYXDZDmItwAh0gLm9t/r+kzs7IKLSCyNPZb5kLI5qW7ppEv5wkjtNn1GODRO4iDe2UCKl9Qx2lsvTJvS9ScA8PK5QBHZwCITJj4jXSc57lGbnMSjSe3ytuq6eUxeSsT6/raWtwqUfn/HbMg4AXayxtxhW3aclHfue+sFgIKx654YRkR9BkVobAdT2cn7qGTjRy3z5CcJdI5B5KjrV1vA9iF9fgkbNn66Yoyz56kZ6wnQ9bG4yRU5CVD/sGdkyEyO9jtqMyKquFfUx4iSynQHR87sMQ0zgz/NBvx8CDiOdofZ6vrV5mCKpvZMrnmHKzMbFjaykbM04P0X1iqqmbc0R0kiGErU6OgUvxyGPDOnGFzFKHh3JJ0qBnRH4pmy+n/PqGeOBkJ3PayCFIexn0yO0baEoxo1yjAnYhhfJabR0BccUU/hSI4Zn9iYgo/JTltgiV+CEZTlnuJYiBIFijUXRWWghKh5568zYB5I8+x8ohLde5BuhbvFhcWX8Fr980dqss3hnmGSJ1ZTU7XrkOOR7WmogN+jbVn57P1UaGoEPv9Sr5piyHQtn1u2QBtkvQReS0XIX2Qx9rwVstuzCD+E4f/x8/KKBT/OolGAAAAABJRU5ErkJggg==";
        this.logoImage = 'data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="561.427" height="131.52" viewBox="0 0 561.427 131.52"><path d="M0 0q-3.516 9.188-4.794 22.211-1.038 10.787-1.039 30.681h8.949q-.24-20.375 1.039-31.559Q5.673 8.228 10.067 0Zm-21.492 10.467q0-11.264-3.595-19.575h-10.308q4.954 8.31 4.794 19.575v52.332h9.109zM-62.879 0q4.794 9.906 6.472 22.451 1.598 11.505 1.199 30.441h8.948q.078-20.775-1.198-31.16Q-48.818 10.786-52.812 0Z" style="fill:#000;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.33333 0 0 -1.33333 229.055 105.68)"/><path d="M0 0q-.64-3.516-2.237-6.392h19.735V0Zm1.119 5.833q2.316 2.954 3.675 5.273h-26.525q-3.278-3.278-5.674-5.273ZM-8.868 0h-19.175v-6.392h16.378Q-9.588-3.436-8.868 0m26.206-25.566q2.157-11.826 12.464-20.294l-7.75-4.555q-9.988 9.747-12.144 23.73-4.477-.48-6.951-.64v-10.466q0-4.075-.72-7.11-.719-3.037-2.716-7.271h-9.348q4.554 8.31 4.314 13.901v1.838q-12.703-9.826-36.193-13.662l3.276 7.67q21.491 3.595 32.917 14.061v.88q0 1.439-.239 2.876-12.545-9.429-35.155-13.582l3.036 7.51q18.457 3.036 29.722 12.144a20.6 20.6 0 0 1-2.317 3.196q-10.787-7.75-30.76-11.585l3.115 7.43q12.384 2.317 19.895 7.191h-14.062q-4.396.08-4.474 4.234V2.957h-5.194q11.106 8.628 17.657 16.778h9.828q-.72-1.04-2.158-2.797h27.885q2.795 0 3.675-1.518.959-1.599-.4-4.154-1.119-2-3.675-5.433h10.866q4.394-.081 4.475-4.235v-13.902H-2.876q3.596-3.675 5.033-8.549 8.548.56 13.663 1.678 7.43 1.677 11.905 4.474v-7.43q-3.997-2.238-10.387-3.435" style="fill:#000;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.33333 0 0 -1.33333 308.313 48.26)"/><path d="M594.412 284.741h17.257v13.423h-17.257zm-4.235-6.871q-1.757 0-2.796 1.038-1.119 1.119-1.118 2.797v23.41h29.721q1.758 0 2.877-1.119t1.119-2.796v-23.33zm11.186 48.896v-.479q0-10.546-6.711-18.376h-9.508q4.474 4.953 6.312 9.348 1.757 4.074 1.758 9.028v.479h-7.75v6.872h30.6q3.916-.001 3.916-3.755v-9.268q0-6.873-3.116-12.544h-9.029q4.075 6.471 4.075 12.224v6.471zm-26.605-50.974q7.11-2.956 13.662-2.955h35.074l-1.438-7.271h-31.399q-17.418.32-29.162 9.747-1.04-6.472-3.036-11.425h-7.75q4.075 9.987 4.074 22.051v15.82h7.511v-15.74q-.001-1.838-.08-2.717 1.996-1.597 4.873-3.515v26.685h-15.419v6.633h11.824v8.867h-10.626v6.632h10.626v7.191h8.07v-7.191h10.546v-6.632h-10.546v-8.867h11.505v-6.633h-8.309v-9.827h7.75v-6.551h-7.75z" style="fill:#000;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.33333 0 0 -1.33333 -376.43 469.674)"/><path d="M0 0h31v-7.271H-.64v-8.149h22.931q4.233-.001 4.234-4.394v-20.374q0-4.475-.799-8.39-.799-3.995-2.716-8.468h-9.109q2.556 5.432 3.436 8.948.798 3.195.799 7.43v18.057H-.64v-42.825h-8.549v42.825h-18.695v-34.435h-8.47v41.626h27.165v8.149h-31.719V0h31.48q-.96 3.595-1.998 6.472h9.508Q-1.04 4.075 0 0" style="fill:#000;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.33333 0 0 -1.33333 520.093 30.576)"/><path d="M0 0c-1.71-.198-3.317 1.545-3.588 3.893-.272 2.348.894 4.411 2.604 4.608 1.711.198 3.317-1.544 3.589-3.892S1.71.198 0 0m19.279 39.278c-9.58 2.313-15.474-2.882-17.493-5.115a1.136 1.136 0 0 1 .166-1.67l5.009-3.75a1.13 1.13 0 0 1 1.46.08c2.944 2.801 7.866 2.642 10.466-1.194 1.489-2.198 1.817-6.815-1.941-9.338-9.431-6.333-28.763 13.977-45.581-1.719l-.001-.003a23.46 23.46 0 0 1-13.2-.022c-11.611-3.402-18.81-15.271-16.447-27.13 2.108-10.58 10.899-17.956 20.962-18.867.331-.03.32-.52-.012-.532a23.55 23.55 0 0 0-11.283 2.442c-.766.379-1.674.369-2.407-.069-13.911-8.295-13.537-25.18-13.135-29.914a1.38 1.38 0 0 1 1.377-1.258h23.802c.608 0 1.146.395 1.319.978.754 2.536 3.592 9.126 12.739 9.126 9.97 0 12.999-6.588 13.796-9.125.182-.58.712-.979 1.321-.979h23.652c.937 0 1.603.909 1.315 1.801-1.452 4.501-5.132 16.431-5.935 24.115-1.362 13.02 3.656 19.77 12.756 29.537 4.784 5.134 11.662 11.724 12.309 21.084.583 8.409-3.347 18.704-15.014 21.522" style="fill:#000;fill-opacity:1;fill-rule:nonzero;stroke:none" transform="matrix(1.33333 0 0 -1.33333 85.72 53.145)"/></svg>`)';
    

        this.libraries = {
            xlsx:   { local: 'js/lib/xlsx.full.min.js',  cdn: 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',                 global: 'XLSX' },
            jszip:  { local: 'js/lib/jszip.min.js',      cdn: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',                    global: 'JSZip' },
            qrcode: { local: 'js/lib/qrcode.min.js',     cdn: 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',        global: 'qrcode' },
            jspdf:  { local: 'js/lib/jspdf.umd.min.js',  cdn: 'https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js',                               global: 'jspdf' },
            docx:   { local: 'js/lib/docx.min.js',       cdn: 'https://unpkg.com/docx@7.1.0/build/index.js',                                        global: 'docx' },
            chart:  { local: 'js/lib/chart.umd.min.js',  cdn: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',             global: 'Chart' }
        };

        this.globalCss = CORE_CSS;

        window.app = this;
    }

    // ==================== 生命周期 ====================

    /** 后台初始化：握手 + 检查更新 + 加载模块清单 + 刷新 tabs */
    async _backgroundInit() {
        this._log('后台初始化开始');

        await this._handshake();
        if (this.cdnAlive) this._checkUpdate().catch(() => {});
        await this._loadManifest();
        this._renderTabs();

        this.backgroundInitDone = true;
        this._log('后台初始化完成');

        if (this._pendingAddModal) {
            this._pendingAddModal = false;
            this.showAddModuleModal();
        }
    }

    /** 构建页面骨架：容器、标题、tabs、modal */
    _buildSkeleton() {
        if (document.querySelector('.container')) return;

        const boot = document.getElementById('boot-loading');
        if (boot) boot.remove();

        document.body.insertAdjacentHTML('beforeend', `
            <div id="messageArea"></div>
            <div class="container">
                <h1>
                    <span class="title-group">
                        ${CORE_TEXT.appTitle}
                        <span class="subtitle"></span>
                    </span>
                    <span id="headerActions">
                        <button id="globalHelpBtn" class="btn help-btn"></button>
                    </span>
                </h1>
                <div id="moduleTabs" class="tabs"></div>
            </div>
            <div id="commonModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modalTitle"></h2>
                        <button id="modalCloseBtn" class="close-btn" title="关闭">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="modalBody"></div>
                        <div id="modalExtraControls"></div>
                    </div>
                </div>
            </div>
        `);
    }

    /** 检查远端最新发行批次，更新红点状态 */
    async _checkUpdate() {
        const ok = await this._loadScript(`${this.cdnBase}main/version.js`, 1000);
        if (!ok) return;
        const latest = window.__LATEST__;
        window.__LATEST__ = null;
        if (!latest || !latest.batch) return;
        if (String(latest.batch) !== String(this.releaseBatch)) {
            this._hasUpdate = true;
            this._latestBatch = latest.batch;
            this._latestDate = latest.date || '';
            this._latestChangelog = Array.isArray(latest.changelog) ? latest.changelog : null;
            this._updateHelpBadge();
            this._log('检查更新：本地', this.releaseBatch, '→ 远端', latest.batch);
        } else {
            this._log('检查更新：已是最新', this.releaseBatch);
        }
    }

    /** 关闭通用模态框，并触发挂起的 onClose 回调 */
    _closeModal() {
        const modal = document.getElementById('commonModal');
        if (modal) modal.style.display = 'none';
        const cb = this._modalOnClose;
        this._modalOnClose = null;
        if (typeof cb === 'function') cb();
    }

    /** CDN 连通性握手，结果缓存到 this.cdnAlive */
    async _handshake() {
        if (this.handshakeDone) return this.cdnAlive;
        this.handshakeDone = true;

        if (this.fromCDN) {
            this.cdnAlive = true;
            this._log('握手：Core 来自 CDN，判定可用');
            return true;
        }

        return new Promise(resolve => {
            const s = document.createElement('script');
            let done = false;

            const finish = (ok) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                if (s.parentNode) s.parentNode.removeChild(s);
                this.cdnAlive = ok;
                this._log('握手：', ok ? 'CDN 可用' : 'CDN 不可用');
                resolve(ok);
            };

            const timer = setTimeout(() => finish(false), 2000);
            s.onload = () => finish(true);
            s.onerror = () => finish(false);
            s.src = `${this.cdnBase}main/ping.txt`;
            document.head.appendChild(s);
        });
    }

    /** 加载模块清单 js/modules.js */
    async _loadManifest() {
        window.__MODULES__ = null;

        const ok = await this._loadWithFallback(
            'js/modules.js',
            () => !!(window.__MODULES__ && window.__MODULES__.list)
        );

        if (ok) {
            this.manifest = window.__MODULES__;
            window.__MODULES__ = null;
            this._itemsCache = null;
            this._log('清单加载成功，共', this.manifest.list.length, '项');
            return;
        }

        this.manifest = null;
        this._log('清单加载失败，仅显示内联模块');
        this.showMessage('功能列表加载失败，请检查网络后刷新', 'warning');
    }

    /** 空日志，由 debug.html 覆写 */
    _log() {}

    /** 启动引擎：构建骨架、加载默认模块、后台初始化 */
    async init() {
        this._log('Core 启动', this.version, this.mode);

        document.title = CORE_TEXT.appTitle;

        this._buildSkeleton();
        this.injectGlobalStyles();
        this._registerInlineModules();
        this._renderTabs();

        document.body.classList.remove('dark-mode');

        this.bindCommonEvents();

        this._updateHelpBadge();
        this.addThemeToggleIcon();

        if (this._businessUrlPlaceholder) {
            setTimeout(() => {
                const code = this.escapeHtml('<script>window.__BUSINESS_URL__ = \'http://a.com/\';</script>');
                this.showModal('请先配置业务网址',
                    '<p>请在 <code>index.html</code> 中找到下面这一行：</p>'
                    + '<pre style="background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto;font-family:Consolas,monospace;font-size:13px;margin:12px 0;">'
                    + code
                    + '</pre>'
                    + '<p>把 <code style="background:#fff3cd;padding:2px 6px;border-radius:3px;">http://a.com/</code> 替换为您的业务系统网址（例如 <code>https://1234.com/5678.html</code>）。改完后刷新页面。</p>'
                );
            }, 500);
        }

        const subtitle = document.querySelector('.subtitle');
        if (subtitle) {
            subtitle.innerHTML = `（<a href="${this.wikiUrl('更新/' + this.releaseDate)}" target="_blank">${this.releaseBatch}</a>）`;
        }

        if (this._hasModule(this.defaultModuleId)) {
            await this.openModule(this.defaultModuleId);
        } else {
            this._log('默认模块不存在：', this.defaultModuleId);
        }

        this._backgroundInit();
    }

    // ==================== 加载器 ====================

    /** 加载单个脚本，超时或失败返回 false */
    _loadScript(src, timeout) {
        const limit = timeout || this.cdnTimeout;
        return new Promise(resolve => {
            const s = document.createElement('script');
            let done = false;

            const finish = (ok) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                if (!ok && s.parentNode) s.parentNode.removeChild(s);
                resolve(ok);
            };

            const timer = setTimeout(() => {
                this._log('脚本超时：', src);
                finish(false);
            }, limit);

            s.onload = () => finish(true);
            s.onerror = () => {
                this._log('脚本加载失败：', src);
                finish(false);
            };
            s.src = src;
            document.head.appendChild(s);
        });
    }

    /** 按候选路径依次尝试加载脚本 */
    async _loadWithFallback(logicalPath, checkFn) {
        const paths = this._resolvePaths(logicalPath);
        for (const p of paths) {
            const isRemote = /^https?:/i.test(p);
            const ok = await this._loadScript(p, isRemote ? this.cdnTimeout : this.localTimeout);
            if (ok && (!checkFn || checkFn())) return true;
        }
        return false;
    }

    /** 根据运行模式解析逻辑路径的可选候选 */
    _resolvePaths(logicalPath) {
        if (this.fromCDN) return [`${this.cdnBase}main/src/${logicalPath}`];
        const paths = [logicalPath];
        if (this.cdnAlive) {
            paths.push(`${this.cdnBase}${this.releaseBatch}/src/${logicalPath}`);
        }
        return paths;
    }

    /** 按需加载第三方库，local 优先，CDN 兜底 */
    async loadLibrary(name) {
        const lib = this.libraries[name];
        if (!lib) {
            console.error('未定义的库：', name);
            return false;
        }
        if (window[lib.global]) return true;
        if (this._libPromises[name]) return this._libPromises[name];

        const promise = (async () => {
            if (!this.fromCDN) {
                await this._loadScript(lib.local, this.localTimeout);
                if (window[lib.global]) {
                    this._log('库：本地加载成功', name);
                    return true;
                }
            }
            if (this.cdnAlive || this.fromCDN) {
                await this._loadScript(lib.cdn, this.cdnTimeout);
                if (window[lib.global]) {
                    this._log('库：CDN 加载成功', name);
                    return true;
                }
            }
            this._log('库：加载失败', name);
            return false;
        })();

        this._libPromises[name] = promise;
        const ok = await promise;
        if (!ok) delete this._libPromises[name];
        return ok;
    }

    // ==================== 模块系统 ====================

    /** 汇总所有可用的模块项（内联 + 清单） */
    _collectModuleItems() {
        if (this._itemsCache) return this._itemsCache;

        const items = [];
        const seen = new Set();

        for (const id of Object.keys(this.moduleClasses)) {
            if (seen.has(id)) continue;
            seen.add(id);

            const fromManifest = this.manifest?.list?.find(m => this._idFromFile(m.file) === id);
            if (fromManifest) {
                items.push(fromManifest);
            } else {
                const Cls = this.moduleClasses[id];
                items.push({
                    file: `${Cls.name}.js`,
                    title: id,
                    icon: 'circle',
                    intro: '',
                });
            }
        }

        if (this.manifest?.list) {
            for (const m of this.manifest.list) {
                const id = this._idFromFile(m.file);
                if (seen.has(id)) continue;
                seen.add(id);
                items.push(m);
            }
        }

        this._itemsCache = items;
        return items;
    }

    /** 确保 panel 元素存在，不存在则创建 */
    _ensurePanel(id) {
        let panel = document.getElementById(`panel-${id}`);
        if (!panel) {
            panel = document.createElement('div');
            panel.id = `panel-${id}`;
            panel.className = 'tab-content';
            const container = document.querySelector('.container');
            if (container) container.appendChild(panel);
        }
        return panel;
    }

    /** 判断模块是否可用（内联或清单中） */
    _hasModule(id) {
        if (this.moduleClasses[id]) return true;
        if (this.manifest?.list?.some(m => this._idFromFile(m.file) === id)) return true;
        return false;
    }

    /** 从类名推导模块 id */
    _idFromClassName(name) {
        return String(name).replace(/Module$/i, '').toLowerCase();
    }

    /** 从文件名推导模块 id */
    _idFromFile(file) {
        return String(file).replace(/\.js$/i, '').replace(/Module$/i, '').toLowerCase();
    }

    /** 按需加载模块类，结果缓存到 moduleClasses */
    async _loadModuleClass(id) {
        if (this.moduleClasses[id]) return this.moduleClasses[id];
        if (this._moduleClassPromises[id]) return this._moduleClassPromises[id];
        if (!this.manifest || !this.manifest.list) return null;

        const item = this.manifest.list.find(m => this._idFromFile(m.file) === id);
        if (!item) {
            this._log('清单中找不到模块：', id);
            return null;
        }

        const className = item.file.replace(/\.js$/, '');
        const basePath = this.manifest.basePath || 'js/module/';

        const promise = (async () => {
            const ok = await this._loadWithFallback(
                `${basePath}${item.file}`,
                () => typeof window[className] === 'function'
            );
            if (ok) {
                this.moduleClasses[id] = window[className];
                this._itemsCache = null;
                this._log('模块加载成功', id);
                return this.moduleClasses[id];
            }
            this._log('模块加载失败', id);
            return null;
        })();

        this._moduleClassPromises[id] = promise;
        const result = await promise;
        delete this._moduleClassPromises[id];
        return result;
    }

    /** 注册 HTML 中 inlineModules 推送的模块类 */
    _registerInlineModules() {
        for (const Cls of this.inlineModules) {
            if (typeof Cls !== 'function') continue;
            const id = this._idFromClassName(Cls.name);
            this.moduleClasses[id] = Cls;
            this._itemsCache = null;
            this._log('注册内联模块：', id);
        }
    }

    /** 切换当前激活模块 */
    _switchTo(id) {
        const wasLoaded = this.loadedIds.includes(id);
        this.currentModuleId = id;
        if (!wasLoaded) this.loadedIds.push(id);

        document.querySelectorAll('.tab-content').forEach(p => {
            p.classList.toggle('active', p.id === `panel-${id}`);
        });

        this._renderTabs();
    }

    /** 关闭模块：销毁实例、移除面板、切换其他已加载模块 */
    async closeModule(id) {
        if (this.loadedIds.length <= 1) {
            this.showMessage('至少保留一个功能页', 'info');
            return;
        }
        if (!this.loadedIds.includes(id)) return;

        const instance = this.modules[id];
        if (instance && typeof instance.destroy === 'function') {
            try { instance.destroy(); } catch (e) { console.error(e); }
        }
        delete this.modules[id];

        const panel = document.getElementById(`panel-${id}`);
        if (panel) panel.remove();

        this.loadedIds = this.loadedIds.filter(x => x !== id);

        this._renderTabs();

        if (this.currentModuleId === id) {
            this.currentModuleId = null;
            await this.openModule(this.loadedIds[0]);
        }
    }

    /** 打开模块：已加载则切换，否则按需加载后渲染 */
    async openModule(id) {
        if (this.currentModuleId === id) return;

        if (this.modules[id]) {
            this._switchTo(id);
            return;
        }

        if (!this.moduleClasses[id] && !this.manifest && !this.backgroundInitDone) {
            this.showMessage('功能列表加载中，请稍候…', 'info');
            return;
        }

        const panel = this._ensurePanel(id);

        if (!this.moduleClasses[id]) {
            panel.innerHTML = `<div class="loading">加载中…</div>`;
            const Cls = await this._loadModuleClass(id);
            if (this.modules[id]) {
                this._switchTo(id);
                return;
            }
            if (!Cls) {
                panel.innerHTML = `<div class="error">模块加载失败</div>`;
                this.showMessage(`模块「${id}」加载失败`, 'error');
                return;
            }
        }

        const Cls = this.moduleClasses[id];
        const instance = new Cls(this);
        instance.id = id;
        this.modules[id] = instance;

        panel.innerHTML = '';
        try {
            if (typeof instance.renderPanel === 'function') {
                instance.renderPanel(panel);
            }
        } catch (e) {
            console.error('renderPanel 失败：', id, e);
            if (typeof instance.destroy === 'function') {
                try { instance.destroy(); } catch (err) { console.error(err); }
            }
            panel.innerHTML = `<div class="error">模块渲染失败：${e.message}</div>`;
            delete this.modules[id];
            return;
        }

        this._switchTo(id);
    }

    // ==================== UI ====================

    /** 渲染 tab 栏 */
    _renderTabs() {
        const bar = document.getElementById('moduleTabs');
        if (!bar) return;

        if (!bar._tabsDelegated) {
            bar._tabsDelegated = true;
            bar.addEventListener('click', (e) => {
                const t = e.target;
                if (!t || typeof t.closest !== 'function') return;

                const closeBtn = t.closest('.tab-close');
                if (closeBtn) {
                    e.stopPropagation();
                    const tab = closeBtn.closest('.tab[data-module]');
                    const id = tab && tab.dataset.module;
                    if (!id) return;
                    this.closeModule(id).catch(err => {
                        console.error('关闭模块失败:', id, err);
                        this.showMessage('关闭失败，请刷新页面重试', 'error');
                    });
                    return;
                }

                const addTab = t.closest('.tab-add');
                if (addTab) {
                    this.showAddModuleModal();
                    return;
                }

                const tab = t.closest('.tab[data-module]');
                if (tab && tab.dataset.module) {
                    this.openModule(tab.dataset.module);
                }
            });
        }

        bar.innerHTML = '';

        const items = this._collectModuleItems();
        const showClose = this.loadedIds.length > 1;

        for (const id of this.loadedIds) {
            const item = items.find(m => this._idFromFile(m.file) === id);
            if (!item) continue;

            const tab = document.createElement('div');
            tab.className = 'tab';
            tab.dataset.module = id;
            if (id === this.currentModuleId) tab.classList.add('active');

            const iconSpan = document.createElement('span');
            iconSpan.className = 'tab-icon';
            iconSpan.innerHTML = this.getIcon(item.icon || 'circle');

            const titleSpan = document.createElement('span');
            titleSpan.className = 'tab-title';
            titleSpan.textContent = item.title || id;

            tab.appendChild(iconSpan);
            tab.appendChild(titleSpan);

            if (showClose) {
                const close = document.createElement('span');
                close.className = 'tab-close';
                close.textContent = '×';
                close.title = '关闭';
                tab.appendChild(close);
            }

            bar.appendChild(tab);
        }

        const add = document.createElement('div');
        add.className = 'tab tab-add';
        const addIcon = document.createElement('span');
        addIcon.className = 'tab-icon';
        addIcon.innerHTML = this.getIcon('plus');
        add.appendChild(addIcon);
        add.appendChild(document.createTextNode('其他功能'));
        bar.appendChild(add);

        for (const id of this.loadedIds) {
            this._ensurePanel(id);
        }
    }

    /** 更新帮助按钮红点 */
    _updateHelpBadge() {
        const btn = document.getElementById('globalHelpBtn');
        if (!btn) return;
        const dot = this._hasUpdate ? '<span class="help-badge"></span>' : '';
        btn.innerHTML = `${this.getIcon('info-circle')} ${CORE_TEXT.info}${dot}`;
    }

    /** 三选一对话框，返回被选中项的 value */
    choose(title, content, options) {
        return new Promise(resolve => {
            let settled = false;
            const settle = (val) => {
                if (settled) return;
                settled = true;
                resolve(val);
            };

            const controls = document.createElement('div');
            controls.className = 'btn-row';
            controls.style.marginBottom = '0';

            for (const opt of options) {
                const btn = document.createElement('button');
                btn.className = `btn ${opt.class || 'btn-secondary'}`;
                btn.textContent = opt.label;
                btn.addEventListener('click', () => {
                    settle(opt.value);
                    this._closeModal();
                });
                controls.appendChild(btn);
            }

            this.showModal(title, content, controls, () => settle(null));
        });
    }

    /** 确认对话框，返回 Promise<boolean> */
    confirm(title, content, opts = {}) {
        return new Promise(resolve => {
            let settled = false;
            const settle = (val) => {
                if (settled) return;
                settled = true;
                resolve(val);
            };

            const controls = document.createElement('div');
            controls.className = 'btn-row';
            controls.style.marginBottom = '0';

            const okBtn = document.createElement('button');
            okBtn.className = `btn ${opts.okClass || 'btn-warning'}`;
            okBtn.textContent = opts.okText || '确认';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = opts.cancelText || '取消';

            okBtn.addEventListener('click', () => {
                settle(true);
                this._closeModal();
            });
            cancelBtn.addEventListener('click', () => {
                settle(false);
                this._closeModal();
            });

            controls.appendChild(okBtn);
            controls.appendChild(cancelBtn);
            this.showModal(title, content, controls, () => settle(false));
        });
    }

    /** 生成空状态 HTML */
    emptyState(text) {
        return `<div class="empty-state">${this.escapeHtml(text || '')}</div>`;
    }

    /** 生成模块帮助按钮 HTML */
    getHelpButton(moduleId, iconName = 'question-circle', label = CORE_TEXT.help) {
        return `<button class="btn help-btn" data-module="${moduleId}">${this.getIcon(iconName)} ${label}</button>`;
    }

    /** 生成 Bootstrap 图标 <img> */
    getIcon(name, size = 26, extraClass = '') {
        const url = `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/icons/${name}.svg`;
        const filetypeCls = name.startsWith('filetype-') ? 'icon-img-filetype' : '';
        return `<img src="${url}" width="${size}" height="${size}" alt="" class="icon-img ${filetypeCls} ${extraClass}">`;
    }

    /** 注入全局样式 */
    injectGlobalStyles() {
        if (document.getElementById('shelfToolGlobalStyles')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'shelfToolGlobalStyles';
        styleEl.textContent = this.globalCss;
        document.head.appendChild(styleEl);
    }

    /** 注入模块级样式，同一 id 只注入一次 */
    injectStyle(id, css) {
        const styleId = `${id}-styles`;
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    /** 生成加载中 HTML */
    loadingState(text) {
        return `<div class="loading-state">${this.escapeHtml(text || '加载中…')}</div>`;
    }

    /**
     * 显示模块级遮罩
     * @param {string} id       模块 id
     * @param {string} [text]   提示文字
     */
    showLoading(id, text) {
        const panel = document.getElementById(`panel-${id}`);
        if (!panel) return;
        if (panel.querySelector('.module-loading-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'module-loading-overlay';
        overlay.innerHTML = `<div class="module-loading-text">${this.escapeHtml(text || '加载中…')}</div>`;
        panel.appendChild(overlay);
    }

    /**
     * 隐藏模块级遮罩
     * @param {string} id
     */
    hideLoading(id) {
        const panel = document.getElementById(`panel-${id}`);
        if (!panel) return;
        const overlay = panel.querySelector('.module-loading-overlay');
        if (overlay) overlay.remove();
    }

    /**
     * 生成上传区 HTML
     * @param {Object} opts
     * @param {string} opts.title       区块标题
     * @param {string} opts.moduleId    帮助按钮的模块 id，不传则不显示
     * @param {string} opts.btnId       上传按钮 id
     * @param {string} opts.btnLabel    上传按钮文字
     * @param {string} [opts.resetId]   重置按钮 id，不传则不显示
     * @param {string} [opts.resetLabel] 重置按钮文字
     * @returns {string}
     */
    uploadSection(opts = {}) {
        const title = opts.title || '上传数据';
        const btnId = opts.btnId || 'uploadBtn';
        const btnLabel = opts.btnLabel || '上传并解析';
        const helpBtn = opts.moduleId ? this.getHelpButton(opts.moduleId) : '';
        const resetBtn = opts.resetId
            ? `<button id="${opts.resetId}" class="btn btn-secondary">${this.getIcon('arrow-counterclockwise')} ${opts.resetLabel || '重置'}</button>`
            : '';
        return `
            <div class="table-header">
                <h2>${title}</h2>
                ${helpBtn}
            </div>
            <div class="toolbar">
                <button id="${btnId}" class="btn">${this.getIcon('filetype-xlsx')} ${btnLabel}</button>
                ${resetBtn}
            </div>
        `;
    }

    /**
     * 绑定上传区事件：点上传 → pickFile → onFile
     * @param {Object} opts
     * @param {string} opts.btnId
     * @param {string} [opts.accept]    文件类型，默认 .xls,.xlsx
     * @param {Function} opts.onFile    选中文件后回调，接收 File
     * @param {string} [opts.resetId]
     * @param {Function} [opts.onReset]
     */
    bindUploadSection(opts = {}) {
        const btn = document.getElementById(opts.btnId || 'uploadBtn');
        if (btn && typeof opts.onFile === 'function') {
            btn.addEventListener('click', async () => {
                try {
                    const file = await this.pickFile({ accept: opts.accept || '.xls,.xlsx' });
                    if (!file) return;
                    await opts.onFile(file);
                } catch (e) {
                    this.showMessage(e.message, 'error');
                }
            });
        }
        if (opts.resetId && typeof opts.onReset === 'function') {
            const rBtn = document.getElementById(opts.resetId);
            if (rBtn) rBtn.addEventListener('click', () => opts.onReset());
        }
    }

    /**
     * 打印单张图片（A4 全页）
     * @param {string} src
     */
    printImage(src) {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write('<html><head><style>@page{size:A4;margin:0;}body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100vh;background:white;}img{max-width:100%;max-height:100%;object-fit:contain;display:block;}</style></head><body></body></html>');
        doc.close();
        const img = doc.createElement('img');
        img.src = src;
        doc.body.appendChild(img);
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }

    /** 弹出"选择模块"对话框 */
    showAddModuleModal() {
        if (!this.backgroundInitDone && !this.manifest) {
            this._pendingAddModal = true;
            this.showModal(CORE_TEXT.modal_addModuleTitle, '<div class="notice">功能列表加载中，请稍候…</div>');
            return;
        }
        this._pendingAddModal = false;

        const available = this._collectModuleItems().filter(m => {
            const id = this._idFromFile(m.file);
            return !this.loadedIds.includes(id);
        });

        let content;
        if (!this.manifest && Object.keys(this.moduleClasses).length === 0) {
            content = `<div class="notice">功能列表加载失败。本地清单缺失，网络不可用。<br>请重新下载完整包，或检查网络后刷新页面。</div>`;
        } else if (available.length === 0) {
            content = `<div class="notice">所有功能都已打开。</div>`;
        } else {
            content = '<div class="module-list">';
            for (const m of available) {
                const id = this._idFromFile(m.file);
                const icon = this.getIcon(m.icon || 'circle');
                content += `<div class="module-item" data-id="${id}">${icon}<strong>${m.title || id}</strong> — ${m.intro || ''}</div>`;
            }
            content += '</div>';
        }

        this.showModal(CORE_TEXT.modal_addModuleTitle, content);

        document.querySelectorAll('#modalBody .module-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.id;
                this._closeModal();
                this.openModule(id);
            });
        });
    }

    /**
     * 全屏图片查看器
     * @param {string[]} images
     * @param {number} startIndex
     * @param {Object} [options]
     * @param {boolean} [options.loop=false]             循环翻页
     * @param {boolean} [options.showOpenOriginal=false] 显示"打开原图"
     * @param {boolean} [options.showPrint=false]        显示"打印"
     * @returns {{close:Function}|null}
     */
    showImageViewer(images, startIndex = 0, options = {}) {
        if (!images || images.length === 0) return null;
        const total = images.length;
        let current = Math.max(0, Math.min(startIndex, total - 1));
        const opts = {
            loop: options.loop === true,
            showOpenOriginal: options.showOpenOriginal === true,
            showPrint: options.showPrint === true,
        };

        document.querySelectorAll('.img-viewer').forEach(v => v.remove());
        if (this._imgViewerKeyHandler) {
            document.removeEventListener('keydown', this._imgViewerKeyHandler);
            this._imgViewerKeyHandler = null;
        }

        const esc = (s) => this.escapeHtml(s);
        const viewer = document.createElement('div');
        viewer.className = 'img-viewer';

        let html = `<button type="button" class="img-viewer-close" title="关闭">×</button>`;
        if (total > 1) {
            html += `<div class="img-viewer-counter"><span class="img-viewer-current">${current + 1}</span> / ${total}</div>`;
            html += `<button type="button" class="img-viewer-prev" title="上一张">‹</button>`;
        }
        html += `<div class="img-viewer-stage"><img src="${esc(images[current])}" alt="图片" /></div>`;
        if (total > 1) {
            html += `<button type="button" class="img-viewer-next" title="下一张">›</button>`;
        }

        const actions = [];
        if (opts.showOpenOriginal) {
            actions.push(`<a class="img-viewer-open" href="${esc(images[current])}" target="_blank" rel="noopener noreferrer">在新标签页打开原图</a>`);
        }
        if (opts.showPrint) {
            actions.push(`<button type="button" class="img-viewer-print">打印</button>`);
        }
        if (actions.length > 0) {
            html += `<div class="img-viewer-actions">${actions.join('')}</div>`;
        }

        viewer.innerHTML = html;
        document.body.appendChild(viewer);

        const imgEl = viewer.querySelector('.img-viewer-stage img');
        const counterEl = viewer.querySelector('.img-viewer-current');
        const openEl = viewer.querySelector('.img-viewer-open');
        const printBtn = viewer.querySelector('.img-viewer-print');
        const prevBtn = viewer.querySelector('.img-viewer-prev');
        const nextBtn = viewer.querySelector('.img-viewer-next');

        const update = (idx) => {
            current = opts.loop
                ? ((idx % total) + total) % total
                : Math.max(0, Math.min(idx, total - 1));
            imgEl.src = images[current];
            if (counterEl) counterEl.textContent = current + 1;
            if (openEl) openEl.href = images[current];
            if (prevBtn) prevBtn.disabled = !opts.loop && current === 0;
            if (nextBtn) nextBtn.disabled = !opts.loop && current === total - 1;
        };

        const close = () => {
            viewer.remove();
            if (this._imgViewerKeyHandler) {
                document.removeEventListener('keydown', this._imgViewerKeyHandler);
                this._imgViewerKeyHandler = null;
            }
        };

        viewer.querySelector('.img-viewer-close').addEventListener('click', (e) => {
            e.stopPropagation();
            close();
        });
        if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); update(current - 1); });
        if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); update(current + 1); });
        if (openEl) openEl.addEventListener('click', (e) => e.stopPropagation());
        if (printBtn) printBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.printImage(images[current]);
        });
        viewer.addEventListener('click', (e) => {
            if (e.target === viewer) close();
        });

        this._imgViewerKeyHandler = (e) => {
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowLeft' && total > 1) update(current - 1);
            else if (e.key === 'ArrowRight' && total > 1) update(current + 1);
        };
        document.addEventListener('keydown', this._imgViewerKeyHandler);

        update(current);
        return { close };
    }

    /** 顶部消息条，最多同屏 3 条 */
    showMessage(message, type) {
        const messageArea = document.getElementById('messageArea');
        if (!messageArea) return;

        const MAX = 3;
        while (messageArea.children.length >= MAX) {
            messageArea.firstChild.remove();
        }

        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = message;
        messageArea.appendChild(div);
        setTimeout(() => {
            if (div.parentNode === messageArea) div.remove();
        }, 3000);
    }

    /**
     * 打开通用模态框
     * @param {string} title
     * @param {string|Node} content
     * @param {Node|null} [extraControls]
     * @param {Function} [onClose] 用户点击 X / 遮罩关闭时触发
     */
    showModal(title, content, extraControls = null, onClose = null) {
        const modal = document.getElementById('commonModal');
        const titleEl = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');
        if (!modal || !titleEl || !body) return;

        titleEl.textContent = title;
        body.innerHTML = '';
        if (content instanceof Node) {
            body.appendChild(content);
        } else {
            body.innerHTML = content == null ? '' : String(content);
        }
        const extraDiv = document.getElementById('modalExtraControls');
        if (extraDiv) {
            extraDiv.innerHTML = '';
            if (extraControls) extraDiv.appendChild(extraControls);
        }
        this._modalOnClose = typeof onClose === 'function' ? onClose : null;
        modal.style.display = 'block';
    }

    // ==================== 主题 ====================

    /** 添加主题切换图标 */
    addThemeToggleIcon() {
        const helpBtn = document.getElementById('globalHelpBtn');
        if (!helpBtn) return;
        if (document.getElementById('themeToggleIcon')) return;
        const iconSpan = document.createElement('span');
        iconSpan.id = 'themeToggleIcon';
        iconSpan.setAttribute('title', CORE_TEXT.themeToggleTitle);
        helpBtn.parentNode.insertBefore(iconSpan, helpBtn);
        this.updateThemeIcon(this.darkModeEnabled);
        iconSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDarkMode();
        });
    }

    /** 切换深浅色模式 */
    toggleDarkMode() {
        this.darkModeEnabled = !this.darkModeEnabled;
        if (this.darkModeEnabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        this.updateThemeIcon(this.darkModeEnabled);
    }

    /** 更新主题图标 */
    updateThemeIcon(isDark) {
        const iconSpan = document.getElementById('themeToggleIcon');
        if (!iconSpan) return;
        iconSpan.innerHTML = isDark ? this.getIcon('moon-fill') : this.getIcon('sun');
    }

    // ==================== 工具方法 ====================

    /**
     * 判断 businessUrl 是否仍是占位符（未配置）
     * @param {string} url
     * @returns {boolean}
     */
    _isBusinessUrlPlaceholder(url) {
        if (!url) return true;
        const origin = this._parseOrigin(url);
        if (!origin) return true;
        return /^https?:\/\/a\.com$/i.test(origin);
    }

    /**
     * 解析网址的 origin，非法时返回空串
     * @param {string} url
     * @returns {string}
     */
    _parseOrigin(url) {
        if (!url) return '';
        let s = String(url).trim();
        if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
        try {
            return new URL(s).origin;
        } catch (e) {
            return '';
        }
    }

    /** 拼接 domain 前缀的完整 URL */
    buildUrl(path) {
        const p = String(path == null ? '' : path);
        if (!this.domain) return p;
        if (!p) return this.domain;
        return this.domain + '/' + p.replace(/^\/+/, '');
    }

    /** 拼接 CDN URL */
    cdnUrl(path) {
        return `${this.cdnBase}main/${path}`;
    }

    /** 复制 HTML 表格内容到剪贴板（TSV） */
    copyTable(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const lines = [];
        const headerCells = table.querySelectorAll('thead tr:first-child th, thead tr:first-child td');
        if (headerCells.length > 0) {
            lines.push(Array.from(headerCells).map(c => c.textContent).join('\t'));
        }
        let bodyRows = table.querySelectorAll('tbody tr');
        if (bodyRows.length === 0) {
            bodyRows = Array.from(table.querySelectorAll('tr')).filter(tr => !tr.closest('thead'));
        }
        bodyRows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length > 0) {
                lines.push(Array.from(cells).map(c => c.textContent).join('\t'));
            }
        });
        const text = lines.join('\n') + '\n';
        this.copyText(text).then(() => {
            this.showMessage(CORE_TEXT.msg_copyTableSuccess, 'success');
        }).catch(err => {
            console.error('复制失败: ', err);
            this.showMessage(CORE_TEXT.msg_copyTableFailed, 'error');
        });
    }

    /** 复制文本到剪贴板，file:// 下用 execCommand 兜底 */
    copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve, reject) => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
            document.body.appendChild(ta);
            ta.select();
            try {
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                ok ? resolve() : reject(new Error('execCommand copy failed'));
            } catch (e) {
                document.body.removeChild(ta);
                reject(e);
            }
        });
    }

    /** 下载数据为文件 */
    download(data, filename, mimeType = 'application/octet-stream') {
        let blob;
        if (data instanceof Blob) blob = data;
        else if (data instanceof ArrayBuffer || data instanceof Uint8Array) blob = new Blob([data], { type: mimeType });
        else if (typeof data === 'string') blob = new Blob([data], { type: mimeType });
        else throw new Error('不支持的数据类型');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /** HTML 转义 */
    escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** 读取每层库位数量设置 */
    getLayerLocationSettings() {
        const mode = this.getOptimizationMode();
        if (mode === 'batch') {
            const locationsPerLayerInput = document.getElementById('locationsPerLayer');
            const layerCountInput = document.getElementById('layerCount');
            const locationsPerLayer = locationsPerLayerInput ? parseInt(locationsPerLayerInput.value) : 9;
            const layerCount = layerCountInput ? parseInt(layerCountInput.value) : 6;
            const settings = {};
            for (let i = 1; i <= layerCount; i++) settings[i] = locationsPerLayer;
            return settings;
        } else {
            const layerCountInput = document.getElementById('layerCount');
            const layerCount = layerCountInput ? parseInt(layerCountInput.value) : 6;
            const settings = {};
            for (let i = 1; i <= layerCount; i++) {
                const input = document.getElementById(`layerLocation_${i}`);
                settings[i] = input ? parseInt(input.value) : 9;
            }
            return settings;
        }
    }

    /** 读取优化模式 radio */
    getOptimizationMode() {
        return this.getRadioValue('optimizationMode', 'batch');
    }

    /** 读取 radio 组当前选中值 */
    getRadioValue(name, defaultValue = '') {
        const selected = document.querySelector(`input[name="${name}"]:checked`);
        return selected ? selected.value : defaultValue;
    }

    /** 弹出文件选择器 */
    pickFile(opts = {}) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            if (opts.accept) input.accept = opts.accept;
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) { resolve(null); return; }
                if (opts.maxSize && file.size > opts.maxSize) {
                    reject(new Error(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB > ${(opts.maxSize / 1024 / 1024).toFixed(1)}MB）`));
                    return;
                }
                resolve(file);
            };
            input.click();
        });
    }

    /** 读取 Excel 文件，返回二维数组 */
    async readExcel(file) {
        const ok = await this.loadLibrary('xlsx');
        if (!ok) throw new Error('XLSX 库未加载');
        const data = new Uint8Array(await file.arrayBuffer());
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        return XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
    }

    /**
     * 读取 Excel 为 { headers, rows }，自动做非空与行数校验
     * @param {File} file
     * @param {Object} [opts]
     * @param {number} [opts.maxRows]            覆盖默认 limits.maxUploadRows
     * @param {string} [opts.emptyMessage]       空文件提示
     * @param {string} [opts.tooManyMessage]     超限提示，用 {n} 占位
     * @param {string} [opts.parseErrorMessage]  解析失败前缀
     * @returns {Promise<{headers:string[],rows:Array<Array>}|null>}
     */
    async readExcelTable(file, opts = {}) {
        let jsonData;
        try {
            jsonData = await this.readExcel(file);
        } catch (e) {
            this.showMessage((opts.parseErrorMessage || '解析Excel失败: ') + e.message, 'error');
            return null;
        }
        if (!jsonData || jsonData.length < 2) {
            this.showMessage(opts.emptyMessage || '文件为空或只有表头', 'error');
            return null;
        }
        const limit = opts.maxRows || this.limits.maxUploadRows;
        if (jsonData.length > limit) {
            const msg = opts.tooManyMessage || `数据超过 ${limit} 行，请拆分后上传`;
            this.showMessage(msg.replace('{n}', limit), 'error');
            return null;
        }
        const headers = jsonData[0].map(h => String(h == null ? '' : h).trim());
        const rows = jsonData.slice(1);
        return { headers, rows };
    }

    /** 拼接 release URL */
    releaseUrl(tag) {
        return `${this.releaseBase}tag/${tag}`;
    }

    /** 生成 yymmddhhmm 时间戳 */
    timestamp() {
        const d = new Date();
        const y = d.getFullYear().toString().slice(2);
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${y}${m}${day}${h}${min}`;
    }

    /** 根据优化模式切换 UI 显示 */
    updateUIfOptimizationMode() {
        const mode = this.getOptimizationMode();
        const batchActions = document.getElementById('batchModeActions');
        const locationsPerLayerGroup = document.getElementById('locationsPerLayerGroup');
        const individualLayer = document.getElementById('individualLayerLocations');
        if (mode === 'batch') {
            if (batchActions) batchActions.classList.remove('hidden');
            if (locationsPerLayerGroup) locationsPerLayerGroup.classList.remove('hidden');
            if (individualLayer) individualLayer.classList.add('hidden');
        } else {
            if (batchActions) batchActions.classList.add('hidden');
            if (locationsPerLayerGroup) locationsPerLayerGroup.classList.add('hidden');
            if (individualLayer) individualLayer.classList.remove('hidden');
        }
    }

    /** 校验文件类型和大小 */
    validateFile(file, opts = {}) {
        if (!file) return false;
        if (opts.maxSize && file.size > opts.maxSize) return false;
        if (opts.accept) {
            const accepts = opts.accept.split(',').map(s => s.trim());
            const mime = file.type || '';
            const name = file.name || '';
            const matched = accepts.some(a => {
                if (a.startsWith('.')) return name.toLowerCase().endsWith(a.toLowerCase());
                if (a.endsWith('/*')) return mime.startsWith(a.slice(0, -1));
                return mime === a;
            });
            if (!matched) return false;
        }
        return true;
    }

    /** 校验库位码：五段，段 4 是 DD 或两位数字，段 5 是两位数字 */
    validateLocationCode(code) {
        if (!code || typeof code !== 'string') return false;
        const parts = code.split('-');
        if (parts.length !== 5) return false;
        const shelfCode = `${parts[0]}-${parts[1]}-${parts[2]}`;
        if (!this.validateShelfCode(shelfCode)) return false;
        if (parts[3] !== 'DD' && !/^\d{2}$/.test(parts[3])) return false;
        if (!/^\d{2}$/.test(parts[4])) return false;
        return true;
    }

    /** 校验货架码：三段，第 2 段两位字母数字，第 3 段非空 */
    validateShelfCode(code) {
        if (!code || typeof code !== 'string') return false;
        const parts = code.split('-');
        if (parts.length !== 3) return false;
        const [, area, shelf] = parts;
        if (!/^[A-Z0-9]{2}$/i.test(area)) return false;
        if (!shelf) return false;
        return true;
    }

    /** 拼接 wiki URL */
    wikiUrl(page, version) {
        const base = `${this.wikiBase}${page}`;
        return version ? `${base}#v${version}` : base;
    }

    // ==================== 事件绑定 ====================

    /** 绑定全局事件委托：帮助、复制、modal 关闭 */
    bindCommonEvents() {
        const globalHelpBtn = document.getElementById('globalHelpBtn');
        if (globalHelpBtn) {
            globalHelpBtn.addEventListener('click', () => {
                let intro = '';
                if (this._hasUpdate) {
                    const MAX_SHOWN = 5;
                    let changelogHtml = '';
                    if (this._latestChangelog && this._latestChangelog.length > 0) {
                        const shown = this._latestChangelog.slice(0, MAX_SHOWN);
                        const more = this._latestChangelog.length - MAX_SHOWN;
                        changelogHtml = '<ul style="margin:8px 0 0;padding-left:20px;">'
                            + shown.map(line => `<li>${this.escapeHtml(line)}</li>`).join('')
                            + (more > 0 ? `<li style="color:var(--text-muted)">…另有 ${more} 条，详见更新日志</li>` : '')
                            + '</ul>';
                    }
                    const versionRange = this._latestBatch
                        ? `（${this.releaseBatch} → ${this._latestBatch}）`
                        : '';
                    const wikiLink = this._latestDate
                        ? this.wikiUrl('更新/' + this._latestDate)
                        : this.releaseBase + 'latest';
                    intro += `<div class="help-update-notice">有新版本${versionRange}，请下载覆盖。`;
                    intro += `<a href="${wikiLink}" target="_blank">查看更新详情</a>`;
                    intro += `<a href="${this.releaseBase}latest" target="_blank">前往下载</a>`;
                    intro += changelogHtml;
                    intro += `</div>`;
                    this._hasUpdate = false;
                    this._latestBatch = null;
                    this._latestDate = null;
                    this._latestChangelog = null;
                    this._updateHelpBadge();
                }
                intro += '<ul>';
                const items = this._collectModuleItems();
                for (const m of items) {
                    const id = this._idFromFile(m.file);
                    intro += `<li><b>${m.title || id}</b>：${m.intro || ''}</li>`;
                }
                intro += '</ul>';
                intro += `<p><strong>核心引擎版本：</strong>${this.version}（${this.lastupdate}）</p>`;
                intro += CORE_TEXT.globalHelpBody.replace(/\{repo\}/g, this.repo);
                this.showModal(CORE_TEXT.modal_globalHelpTitle, intro);
            });
        }

        document.addEventListener('click', (event) => {
            const t = event.target;
            if (!t || typeof t.closest !== 'function') return;
            const helpBtn = t.closest('.help-btn');
            if (!helpBtn) return;
            const moduleId = helpBtn.dataset.module;
            if (!moduleId) return;
            const module = this.modules[moduleId];
            if (module && module.helpDescription) {
                const wikiBase = this.wikiUrl('使用/' + encodeURIComponent(module.title || moduleId));
                const content = module.helpDescription
                    .replace(/\{wiki:([^}]+)\}/g, (_, anchor) => `${wikiBase}#${anchor}`)
                    .replace(/\{wiki\}/g, wikiBase)
                    + `<p class="help-version-line">${CORE_TEXT.helpVersion}${module.ver || ''}（${module.lastupdate || ''}）</p>`;
                this.showModal((module.title || moduleId) + ' - ' + CORE_TEXT.help, content);
            }
        });

        const modalCloseBtn = document.getElementById('modalCloseBtn');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                this._closeModal();
            });
        }
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('commonModal');
            if (event.target === modal) this._closeModal();
        });

        document.addEventListener('click', (event) => {
            const t = event.target;
            if (!t || typeof t.closest !== 'function') return;
            const copyBtn = t.closest('.copy-btn');
            if (!copyBtn) return;
            const tableId = copyBtn.getAttribute('data-table');
            if (tableId) this.copyTable(tableId);
        });
    }
}

// ==================== 常量 ====================

const CORE_HEADERS = {
    locationChange: ['仓库名称', '库位号', '名称', '作为补入库位', '作为补出库位', '分拣排序', '上架排序', '逻辑区名称', '单独打包分区编号', '库位规格名称', '库位BAND', '批次码库位', '常温短保品库位'],
    locationNew: ['库位号', '库位名称', '库区', '所属部门', '库位类型', '逻辑区名称', '单独打包分区编号', '营销属性', '是否可做补出库位', '是否可做补入库位', '分拣排序', '上架排序', '补货排序', '是否混放批次', '是否混放供应商', '存储类型', '后台类目', '库位规格名称', '库位BAND', '批次码库位', '常温短保品库位', '库位用途'],
    locationDeleted: ['库位号', '删除原因'],
};

// ==================== 样式 ====================

const CORE_CSS = `
:root{
--accent:#FFBD00;
--accent-hover:#FFA000;
--accent-text:#b08800;
--accent-soft:#fff9e6;
--text-strong:#333;
--text:#555;
--text-muted:#888;
--bg-body:#f5f5f5;
--bg-panel:#fff;
--bg-sub:#f9f9f9;
--bg-hover:#fff9e6;
--bg-input:#fff;
--border:#e0e0e0;
--border-soft:#f0f0f0;
--success:#4caf50;
--danger:#f44336;
--warn:#FFA000;
--info:#2196f3;
--r-sm:6px;
--r:10px;
--r-lg:14px;
--r-pill:999px;
--shadow-sm:0 2px 8px rgba(0,0,0,.06);
--shadow:0 4px 16px rgba(0,0,0,.08);
--shadow-accent:0 4px 12px rgba(255,189,0,.25);
--shadow-accent-lg:0 8px 20px rgba(255,189,0,.35);
--sp-1:4px;
--sp-2:8px;
--sp-3:12px;
--sp-4:16px;
--sp-5:20px;
--sp-6:24px;
--fs-xs:12px;
--fs-sm:13px;
--fs:15px;
--fs-md:16px;
--fs-lg:18px;
--fs-xl:22px;
--t-fast:.15s ease;
--t:.25s ease;
}
body.dark-mode{
--accent-text:#FFD54F;
--accent-soft:#2a2a1a;
--text-strong:#f0f0f0;
--text:#cccccc;
--text-muted:#888;
--bg-body:#0a0a0a;
--bg-panel:#1e1e2a;
--bg-sub:#2a2a36;
--bg-hover:#32323e;
--bg-input:#2c2c38;
--border:#3a3a48;
--border-soft:#2d2d38;
--success:#66bb6a;
--danger:#ff6b6b;
--info:#64b5f6;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scrollbar-gutter:stable}
body{background:var(--bg-body);color:var(--text);line-height:1.6;padding:var(--sp-5);min-height:100vh;font-family:"Microsoft YaHei","Segoe UI",Arial,sans-serif;transition:background var(--t),color var(--t)}
input,button,select,textarea,.btn,.tab,.tab-btn,.modal-content,th,td,label,.note,.notice,.message{font-family:inherit}
.container{max-width:1400px;margin:0 auto;background:var(--bg-panel);border-radius:var(--r-lg);box-shadow:var(--shadow);padding:var(--sp-6);display:flex;flex-direction:column;gap:var(--sp-6)}
h1,h2,h3,h4{color:var(--text-strong);margin-bottom:var(--sp-5)}
h1{border-bottom:3px solid var(--accent);padding-bottom:var(--sp-4);font-size:var(--fs-xl);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--sp-2)}
.title-group{display:inline-flex;align-items:baseline;flex-wrap:wrap;gap:var(--sp-1)}
.subtitle{font-size:.65em;color:var(--text-muted);font-weight:400}
.note,.notice{color:var(--text-muted);margin-top:var(--sp-2);font-size:var(--fs-sm);line-height:1.5}
.notice{background:var(--accent-soft);padding:var(--sp-3) var(--sp-4);border-radius:var(--r-sm);border-left:4px solid var(--accent)}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes modalSlideIn{from{opacity:0;transform:translate(-50%,-45%)}to{opacity:1;transform:translate(-50%,-50%)}}
.hidden{display:none!important}
.section{padding:var(--sp-6);border:1px solid var(--border-soft);border-radius:var(--r-lg);background-color:var(--bg-panel);box-shadow:var(--shadow-sm);margin-bottom:var(--sp-6);transition:box-shadow var(--t)}
.section:hover{box-shadow:var(--shadow)}
.table-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-4);padding-bottom:var(--sp-4);border-bottom:2px solid var(--border-soft);flex-wrap:wrap;gap:var(--sp-3)}
.table-title{display:flex;align-items:center;gap:var(--sp-4);flex-wrap:wrap}
.tabs{display:flex;border-bottom:2px solid var(--border);margin-bottom:var(--sp-6);border-radius:var(--r) var(--r) 0 0;padding:var(--sp-1) var(--sp-1) 0 var(--sp-1);flex-wrap:wrap;gap:var(--sp-1)}
.tab,.tab-btn{padding:var(--sp-3) var(--sp-4);cursor:pointer;border:1px solid transparent;border-bottom:0;border-radius:var(--r) var(--r) 0 0;background-color:var(--bg-sub);font-weight:600;color:var(--text-muted);font-size:var(--fs);transition:all var(--t);display:inline-flex;align-items:center}
.tab:hover,.tab-btn:hover{background-color:var(--border-soft);color:var(--text-strong)}
.tab.active,.tab-btn.active{background-color:var(--accent-soft);border-color:var(--border);border-bottom:1px solid var(--bg-panel);border-top:3px solid var(--accent);margin-bottom:-1px;font-weight:700;color:var(--accent-text);box-shadow:none}
.tab .icon-img{width:28px;height:28px;margin-right:0}
.tab-icon{display:inline-flex;align-items:center;margin-right:var(--sp-1)}
.tab-title{white-space:nowrap}
.tab-close{margin-left:var(--sp-2);cursor:pointer;font-weight:bold;font-size:var(--fs-lg);line-height:1;opacity:.6;transition:opacity var(--t-fast)}
.tab-close:hover{opacity:1}
.tab-add{opacity:.7}
.tab.not-loaded{opacity:.85}
.tab-content,.tab-content-inner{display:none;animation:fadeIn var(--t) ease}
.tab-content.active,.tab-content-inner.active{display:block}
.module-list{display:flex;flex-direction:column;gap:var(--sp-2)}
.module-item{padding:var(--sp-3);border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;transition:background var(--t);display:flex;align-items:center;gap:var(--sp-2)}
.module-item:hover{background:var(--accent-soft)}
.btn{display:inline-block;color:#fff;border:2px solid transparent;padding:var(--sp-3) var(--sp-4);border-radius:var(--r);cursor:pointer;font-size:var(--fs-md);font-weight:700;width:auto;text-align:center;box-shadow:var(--shadow-accent);text-decoration:none;transition:all var(--t);background:linear-gradient(135deg,var(--accent) 0%,var(--accent-hover) 100%)}
.btn:disabled{background:#ccc;cursor:not-allowed;box-shadow:none}
.btn:hover{background:linear-gradient(135deg,var(--accent-hover) 0%,#ef6c00 100%);box-shadow:var(--shadow-accent-lg)}
.btn:active{box-shadow:var(--shadow-accent)}
.btn-secondary{background:var(--bg-sub);box-shadow:none;color:var(--text);border:2px solid var(--border)}
.btn-secondary:hover{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-text);box-shadow:none}
.btn-success,.copy-btn{background:linear-gradient(135deg,var(--success) 0%,#388e3c 100%);box-shadow:0 4px 12px rgba(76,175,80,.25);color:#fff}
.btn-success:hover,.copy-btn:hover{background:linear-gradient(135deg,#388e3c 0%,#2e7d32 100%);box-shadow:0 8px 20px rgba(76,175,80,.35)}
.btn-warning,.help-btn{background:linear-gradient(135deg,var(--warn) 0%,#f57c00 100%);box-shadow:0 4px 12px rgba(255,152,0,.25);color:#fff}
.btn-warning:hover,.help-btn:hover{background:linear-gradient(135deg,#f57c00 0%,#ef6c00 100%);box-shadow:0 8px 20px rgba(255,152,0,.35)}
.btn-danger{background:var(--danger);color:#fff;box-shadow:0 4px 12px rgba(244,67,54,.25)}
.btn-danger:hover{background:#d32f2f;box-shadow:0 8px 20px rgba(244,67,54,.35)}
.copy-btn,.help-btn{padding:var(--sp-2) var(--sp-5);font-size:var(--fs-sm);display:inline-flex;align-items:center;justify-content:center;gap:var(--sp-1)}
.copy-btn .icon-img,.help-btn .icon-img{margin-right:0;display:block}
.btn-sm{padding:var(--sp-2) var(--sp-3);font-size:var(--fs-sm)}
.btn-xs{padding:var(--sp-1) var(--sp-2);font-size:var(--fs-xs)}
.btn-icon{width:40px;height:40px;padding:0;display:inline-flex;align-items:center;justify-content:center}
input,select,button,textarea{width:100%;padding:var(--sp-3) var(--sp-4);border:2px solid var(--border);border-radius:var(--r);font-size:var(--fs-md);transition:all var(--t);background:var(--bg-input);color:var(--text-strong)}
input:focus,select:focus,textarea:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,189,0,.15)}
input[readonly]{background-color:var(--bg-sub);color:var(--text-muted);cursor:not-allowed}
label{display:block;margin-bottom:var(--sp-2);font-weight:600;color:var(--text-strong);font-size:var(--fs)}
textarea{height:180px;resize:vertical;line-height:1.5}
.input-block{width:100%}
.input-inline{width:auto;min-width:160px}
.input-sm{padding:var(--sp-2) var(--sp-3);font-size:var(--fs-sm)}
.form-group{margin-bottom:var(--sp-5)}
.form-row{display:flex;gap:var(--sp-5);align-items:flex-start;flex-wrap:wrap}
.form-row .form-group{flex:1;min-width:200px}
.validation-message{font-size:var(--fs-sm);margin-top:var(--sp-1);display:block;padding-left:var(--sp-1)}
.validation-valid{color:var(--success)}
.validation-invalid{color:var(--danger)}
input.validation-invalid{border-color:var(--danger);background-color:rgba(244,67,54,.05)}
input.validation-valid{border-color:var(--success);background-color:rgba(76,175,80,.05)}
.checkbox-group{display:flex;align-items:center;margin:var(--sp-3) 0}
.checkbox-group input{width:20px;height:20px;margin-right:var(--sp-3);accent-color:var(--accent);flex-shrink:0}
.checkbox-group label{margin-bottom:0;cursor:pointer;font-weight:400}
.table-container{max-height:450px;overflow-y:auto;border:1px solid var(--border-soft);border-radius:var(--r);margin-bottom:var(--sp-6);box-shadow:var(--shadow-sm)}
table{width:100%;border-collapse:collapse;font-size:var(--fs-sm)}
th,td{border:1px solid var(--border-soft);padding:var(--sp-3) var(--sp-4);text-align:left;white-space:nowrap}
th{background:var(--bg-sub);color:var(--text-strong);font-weight:700;font-size:var(--fs-sm);position:sticky;top:0;z-index:10;border-bottom:2px solid var(--border)}
td{color:var(--text);font-size:var(--fs-sm)}
tr:nth-child(even){background-color:var(--bg-sub)}
tr:hover{background-color:var(--bg-hover)}
#messageArea{position:fixed;top:var(--sp-6);left:50%;transform:translateX(-50%);z-index:10001;width:auto;max-width:85%}
.message{padding:var(--sp-4) var(--sp-6);margin:var(--sp-3) 0;border-radius:var(--r);box-shadow:0 6px 16px rgba(0,0,0,.12);font-weight:700;text-align:center;min-width:320px;font-size:var(--fs)}
.success{background-color:rgba(76,175,80,.12);color:#2e7d32;border-left:5px solid var(--success)}
.error{background-color:rgba(244,67,54,.12);color:#c62828;border-left:5px solid var(--danger)}
.info{background-color:var(--bg-sub);color:var(--text);border-left:5px solid var(--text-muted)}
.warning{background-color:rgba(255,160,0,.12);color:#ef6c00;border-left:5px solid var(--warn)}
.modal{display:none;position:fixed;z-index:10000;left:0;top:0;width:100%;height:100%;background-color:rgba(0,0,0,.5);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:fadeIn var(--t) ease}
.modal-content{background-color:var(--bg-panel);padding:0;border-radius:var(--r-lg);width:80vw;height:80vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.2);position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);border:1px solid var(--border);animation:modalSlideIn .4s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:var(--sp-6);border-bottom:2px solid var(--border-soft);background:var(--bg-panel);flex-shrink:0;border-radius:var(--r-lg) var(--r-lg) 0 0}
.modal-header h2{margin:0;color:var(--text-strong);font-size:var(--fs-xl);font-weight:700}
.close-btn{background:0 0;border:0;font-size:32px;cursor:pointer;color:var(--text-muted);padding:var(--sp-1) var(--sp-2);line-height:1;transition:all var(--t);border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;min-width:auto}
.close-btn:hover{color:var(--text-strong);background:var(--bg-sub)}
.modal-body{padding:var(--sp-6);overflow-y:auto;flex:1;min-height:0}
@media (max-width:1200px){.modal-content{width:90vw;height:85vh}}
@media (max-width:992px){.container{padding:var(--sp-5)}}
@media (max-width:768px){body{padding:var(--sp-3)}.container{padding:var(--sp-3);border-radius:var(--r)}h1{font-size:var(--fs-xl)}.form-row{flex-direction:column;gap:var(--sp-3)}.btn{min-width:100%;width:100%;margin-right:0}.message{min-width:auto;padding:var(--sp-3) var(--sp-4);font-size:var(--fs-sm);width:95%}.modal-content{width:95%;height:90vh}.tabs{flex-direction:column;gap:var(--sp-1)}.tab,.tab-btn{border-radius:var(--r-sm);width:100%;text-align:center;justify-content:center}.table-header{flex-direction:column;align-items:flex-start;gap:var(--sp-3)}.section{padding:var(--sp-5)}th,td{padding:var(--sp-2) var(--sp-3);font-size:var(--fs-sm)}}
@media (max-width:480px){.container{padding:var(--sp-3)}h1{font-size:var(--fs-lg)}h2{font-size:var(--fs-md)}h3{font-size:var(--fs)}.btn{padding:var(--sp-3) var(--sp-5);font-size:var(--fs)}.section{padding:var(--sp-4)}.modal-header{padding:var(--sp-5);flex-direction:column;align-items:flex-start;gap:var(--sp-3)}.modal-header h2{font-size:var(--fs-lg)}.modal-body{padding:var(--sp-5)}}
@media print{body{background:#fff;padding:0}.container{box-shadow:none;border-radius:0;padding:var(--sp-2)}.btn,.tabs,.tab,.modal,.message{display:none!important}.section{break-inside:avoid;box-shadow:none;border:1px solid #ccc}table{break-inside:avoid}}
a,a:link,a:visited{text-decoration:none;color:#06c}
a:hover{text-decoration:underline;color:#049}
#globalHelpBtn{width:auto;margin:0}
#headerActions{display:inline-flex;align-items:center;gap:var(--sp-2)}
#themeToggleIcon{display:inline-flex;align-items:center;cursor:pointer;border-radius:50%;width:32px;height:32px;justify-content:center;background:transparent}
.icon-img{filter:var(--icon-filter,none);vertical-align:middle;margin-right:var(--sp-1);display:inline-block}
.btn .icon-img,.help-btn .icon-img,.copy-btn .icon-img{filter:invert(1)}
.btn-secondary .icon-img{filter:none}
.btn .icon-img.icon-img-filetype{filter:none}
body.dark-mode .btn-secondary .icon-img{filter:invert(1)}
.quick-btn .icon-img{margin-right:0;vertical-align:middle;filter:none}
.help-version-line{margin-top:var(--sp-4);padding-top:var(--sp-3);border-top:1px solid var(--border-soft);color:var(--text-muted);font-size:var(--fs-sm)}
.help-badge{display:inline-block;width:8px;height:8px;background:var(--danger);border-radius:50%;vertical-align:middle}
.help-update-notice{padding:var(--sp-3) var(--sp-4);margin-bottom:var(--sp-3);background:var(--accent-soft);border-left:4px solid var(--accent);border-radius:var(--r-sm);font-size:var(--fs-sm)}
.help-update-notice a{margin-left:var(--sp-2)}
.btn-row{display:flex;gap:var(--sp-3);flex-wrap:wrap;align-items:center;margin-bottom:var(--sp-5)}
.btn-row .btn{margin-bottom:0}
.toolbar{display:flex;gap:var(--sp-3);flex-wrap:wrap;align-items:center;margin-bottom:var(--sp-4)}
.toolbar .btn{margin-bottom:0}
.panel-box{border:1px solid var(--border);border-radius:var(--r);background:var(--bg-sub);padding:var(--sp-3);margin-top:var(--sp-3)}
.panel-box .form-group:last-child{margin-bottom:0}
.columns-row{display:flex;gap:var(--sp-5);flex-wrap:wrap}
.list-container{max-height:400px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r);background:var(--bg-panel)}
.list-item{display:flex;align-items:center;padding:var(--sp-2) var(--sp-3);border-bottom:1px solid var(--border-soft)}
.list-item-even{background:var(--bg-sub)}
.list-item-odd{background:var(--bg-panel)}
.search-input{flex:1;min-width:150px;padding:var(--sp-2) var(--sp-3);border:1px solid var(--border);border-radius:var(--r-sm);font-size:var(--fs-sm);background:var(--bg-panel);color:var(--text-strong)}
.status-text{font-size:var(--fs-sm);color:var(--text-muted)}
.loading{padding:var(--sp-6);text-align:center;color:var(--text-muted);font-size:var(--fs)}
.empty-state{padding:40px var(--sp-5);text-align:center;color:var(--text-muted);font-size:var(--fs)}
.loading-state{padding:40px var(--sp-5);text-align:center;color:var(--text-muted);font-size:var(--fs)}
.error-message{padding:var(--sp-5);color:var(--danger);text-align:center}
.file-input-wrapper{position:relative;overflow:hidden;display:inline-block;width:100%}
.file-input-wrapper input[type=file]{position:absolute;left:0;top:0;opacity:0;width:100%;height:100%;cursor:pointer}
.file-input-button{display:block;padding:var(--sp-4);background:var(--bg-sub);border:2px dashed var(--accent);border-radius:var(--r);text-align:center;color:var(--accent-text);cursor:pointer;transition:all var(--t);font-weight:600}
.file-input-button:hover{background:var(--accent-soft);border-color:var(--accent-hover);color:var(--accent-text)}
.img-viewer{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:20000;display:flex;align-items:center;justify-content:center;animation:fadeIn var(--t) ease}
.img-viewer-stage{max-width:92vw;max-height:88vh;display:flex;align-items:center;justify-content:center}
.img-viewer-stage img{max-width:92vw;max-height:88vh;object-fit:contain;display:block;border-radius:var(--r-sm);box-shadow:0 8px 32px rgba(0,0,0,.6)}
.img-viewer-close{position:absolute;top:var(--sp-4);right:var(--sp-5);width:42px;height:42px;border:0;background:rgba(255,255,255,.15);color:#fff;font-size:28px;line-height:1;border-radius:50%;cursor:pointer;transition:background var(--t);display:flex;align-items:center;justify-content:center;padding:0}
.img-viewer-close:hover{background:rgba(255,255,255,.3)}
.img-viewer-prev,.img-viewer-next{position:absolute;top:50%;transform:translateY(-50%);width:56px;height:56px;border:0;background:rgba(255,255,255,.15);color:#fff;font-size:38px;line-height:1;border-radius:50%;cursor:pointer;transition:background var(--t);display:flex;align-items:center;justify-content:center;padding:0 0 6px 0;font-family:inherit}
.img-viewer-prev:hover:not(:disabled),.img-viewer-next:hover:not(:disabled){background:rgba(255,255,255,.3)}
.img-viewer-prev:disabled,.img-viewer-next:disabled{opacity:.3;cursor:default}
.img-viewer-prev{left:var(--sp-6)}
.img-viewer-next{right:var(--sp-6)}
.img-viewer-counter{position:absolute;top:var(--sp-5);left:50%;transform:translateX(-50%);color:#fff;background:rgba(0,0,0,.55);padding:var(--sp-2) var(--sp-4);border-radius:var(--r-pill);font-size:var(--fs);font-family:monospace;letter-spacing:1px}
.img-viewer-current{font-weight:700;color:var(--accent)}
.img-viewer-actions{position:absolute;bottom:var(--sp-5);left:50%;transform:translateX(-50%);display:flex;gap:var(--sp-3)}
.img-viewer-actions .img-viewer-open,.img-viewer-actions .img-viewer-print{color:#fff;background:rgba(255,255,255,.15);padding:var(--sp-2) var(--sp-5);border-radius:var(--r-pill);font-size:var(--fs-sm);text-decoration:none;transition:background var(--t);border:0;cursor:pointer;font-family:inherit}
.img-viewer-actions .img-viewer-open:hover,.img-viewer-actions .img-viewer-print:hover{background:rgba(255,255,255,.3);text-decoration:none;color:#fff}
.module-loading-overlay{position:absolute;inset:0;background:rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;z-index:999;border-radius:var(--r)}
.module-loading-text{padding:var(--sp-4) var(--sp-6);background:var(--accent);color:#1e2a3e;border-radius:var(--r);font-weight:700;font-size:var(--fs-md)}
body.dark-mode .icon-img{--icon-filter:invert(1)}
body.dark-mode .success{background-color:rgba(76,175,80,.15);color:#c8e6c9}
body.dark-mode .error{background-color:rgba(244,67,54,.15);color:#ffcdcd}
body.dark-mode .warning{background-color:rgba(255,160,0,.15);color:#ffe0b2}
body.dark-mode .module-loading-overlay{background:rgba(20,20,28,.85)}
`;

// ==================== 文案 ====================

const CORE_TEXT = {
    appTitle: '二维码及库位优化工具',
    help: '帮助',
    info: '说明',
    otherModules: '其他功能',
    themeToggleTitle: '切换深色/浅色模式',
    notDefined: '未定义',
    helpVersion: '版本：',
    modal_addModuleTitle: '选择要加载的模块',
    modal_globalHelpTitle: '工具说明',
    msg_copyTableSuccess: '表格内容已复制到剪贴板',
    msg_copyTableFailed: '复制失败，请手动选择并复制表格内容',
    globalHelpBody: '<p>计算为本地运行，不会向互联网传输任何数据。</p><p>下载地址：<a href="https://gitee.com/{repo}/releases" target="_blank">https://gitee.com/{repo}/releases</a></p>'
};

window.Core = Core;