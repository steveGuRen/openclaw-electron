# openclaw集成企微流程
## openclaw安装企微插件
在本地终端，输入以下命令，安装企微插件。
openclaw plugins install @wecom/wecom-openclaw-plugin

重启OpenClaw。
openclaw gateway restart

在终端中，输入以下命令，添加渠道。
openclaw channels add
在select channel步骤，选择 channel 为企业微信（wecom）。

逐个输入企业微信机器人Bot ID、Secret。

选择 finish。

选择配对方式，选择 Pairing。

然后等待配置完成。

再执行`## 企微配置机器人`，在企业微信中，保存机器人。




## 企微配置机器人
### 步骤1：点击【智能机器人】
DOM选择器如下：
<button data-v-79de7976="" type="button" class="create_btn t-button t-button--variant-base t-button--theme-primary"><span class="t-button__text">
      创建机器人
    </span></button>


### 步骤2：点击【手动创建】
<div data-v-334efb74="" class="blank_create_btn"><span data-v-334efb74="">手动创建</span> <svg data-v-334efb74="" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10" width="6" height="10" class="wd-icon-svg wd-icon-svg-chevron_right_6w10h blank_create_btn_icon"><path data-v-334efb74="" fill="currentColor" fill-rule="evenodd" d="M1.15.9c.2-.2.5-.2.7 0l3.58 3.57c.29.3.29.77 0 1.06L1.85 9.1a.5.5 0 11-.7-.7L4.55 5l-3.4-3.4a.5.5 0 010-.7z" clip-rule="evenodd"></path></svg></div>

### 步骤3：点击【API模式创建】
<span data-v-58a72057="" data-v-007bbc01="">
                  如需使用自有系统获取成员与机器人的聊天并输出回复，可切换至
                  <a data-v-58a72057="" target="" class="u-ml-2 t-link t-link--theme-default t-link--hover-underline t-link--theme-blue_darken  " data-v-007bbc01="">
                    API 模式创建
                  </a></span>

### 步骤4：编辑机器人信息
点击【编辑】
<button data-v-58a72057="" type="button" class="edit_title_button t-button t-button--variant-text t-button--theme-default t-size-s t-button--shape-square" variant="text" shape="square" size="small" data-v-007bbc01=""><span class="t-button__text"><svg data-v-58a72057="" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" class="wd-icon-svg wd-icon-svg-pencil_line_16 edit_icon"><path data-v-58a72057="" fill="currentColor" fill-rule="evenodd" d="M10.94 2.36a1.5 1.5 0 012.12 0l.59.58a1.5 1.5 0 010 2.12l-8.21 8.21a1 1 0 01-.4.24l-2.88.97-.95.31.32-.95.96-2.88a1 1 0 01.24-.4l8.2-8.2zm1.41.7a.5.5 0 00-.7 0l-.44.44 1.29 1.3.44-.44a.5.5 0 000-.71l-.59-.59zm-8.91 8.21l7.06-7.06 1.3 1.3-7.07 7.05-1.94.65.65-1.94zM7.5 13a.5.5 0 000 1h8a.5.5 0 100-1h-8z" clip-rule="evenodd"></path></svg></span></button>

然后，在弹出的弹窗里，完善机器人基本信息：
点击并输入机器人名称：
<div data-v-6d7ef8fb="" class="wd-input wd-input-default " value="" placeholder="输入智能机器人名称" status="error" tips="请输入名称" data-v-1c0e6446=""><div class="t-input__wrap"><div class="t-input t-is-error"><input autocomplete="" placeholder="输入智能机器人名称" type="text" unselectable="off" class="t-input__inner"></div><div class="t-input__tips t-input__tips--error">请输入名称</div></div></div>

点击并输入机器人简介：
<div data-v-6d7ef8fb="" class="t-textarea" data-v-1c0e6446=""><textarea placeholder="输入简介让大家快速了解智能机器人能做什么" unselectable="off" class="t-textarea__inner t-is-error t-resize-none" style="min-height: 80px; height: 80px;"></textarea><div class="t-textarea__info_wrapper"><div class="t-textarea__tips t-textarea__tips--error">请输入简介</div></div></div>

点击【确定】
<button data-v-6d7ef8fb="" type="button" class="t-button t-button--variant-base t-button--theme-primary" style="width: 120px;"><span class="t-button__text">
      确定
    </span></button>

## 步骤5：配置可见范围
点击【添加】
<div data-v-1d646dd3="" data-v-58a72057="" class="visible_selector" data-v-007bbc01=""><!----> <a data-v-1d646dd3="" class="link add_btn no_underline">添加</a></div>

在弹窗里，将信息收集页，将用户填写的用户名，输入到搜索框

点击搜索框：
<input type="text" id="memberSearchInput" class="qui_inputText ww_inputText ww_searchInput_text" placeholder="搜索成员、部门或标签">

输入文案后回车

点击确认：
<a id="footer_submit_btn" class="qui_btn ww_btn ww_btn_Blue js_submit" d_ck="submit" href="javascript:;">确认</a>

### 步骤6：复制BotId
这个botId就是我们发给openclaw的botId，暂存起来。
<span data-v-308c4c53="" class="sdk-copy"><span data-v-308c4c53="" class="sdk-copy-icon"><svg data-v-308c4c53="" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" class="wd-icon-svg wd-icon-svg-copy_16 u-w-16 u-h-16"><path data-v-308c4c53="" fill="currentColor" d="M12 1a2 2 0 012 2v8a2 2 0 01-2 2 2 2 0 01-2 2H4a2 2 0 01-2-2V5c0-1.1.9-2 2-2 0-1.1.9-2 2-2h6zM4 4a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V5a1 1 0 00-1-1H4zm2-2a1 1 0 00-1 1h5a2 2 0 012 2v7a1 1 0 001-1V3a1 1 0 00-1-1H6zm1.5 7a.5.5 0 010 1H5a.5.5 0 010-1h2.5zM9 7a.5.5 0 010 1H5a.5.5 0 010-1h4z"></path></svg></span></span>

### 步骤7：获取secret
点击【点击获取】
<span data-v-308c4c53="" class="sdk-get-secret">点击获取</span>

### 步骤6：复制secret
这个secret就是我们要发给openclaw的secret，暂存起来。
<span data-v-308c4c53="" class="sdk-copy-icon"><svg data-v-308c4c53="" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" class="wd-icon-svg wd-icon-svg-copy_16 u-w-16 u-h-16"><path data-v-308c4c53="" fill="currentColor" d="M12 1a2 2 0 012 2v8a2 2 0 01-2 2 2 2 0 01-2 2H4a2 2 0 01-2-2V5c0-1.1.9-2 2-2 0-1.1.9-2 2-2h6zM4 4a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V5a1 1 0 00-1-1H4zm2-2a1 1 0 00-1 1h5a2 2 0 012 2v7a1 1 0 001-1V3a1 1 0 00-1-1H6zm1.5 7a.5.5 0 010 1H5a.5.5 0 010-1h2.5zM9 7a.5.5 0 010 1H5a.5.5 0 010-1h4z"></path></svg></span>


### 步骤8：提交机器人信息
点击【保存】：
<button data-v-58a72057="" type="button" class="navi_button t-button t-button--variant-base t-button--theme-primary t-size-full-width" block="" data-v-007bbc01=""><span class="t-button__text">
              保存
            </span></button>

## 配对
指引用户，在企微里搜索刚刚创建的机器人，与它对话。
会收到一个配置密钥。

让用户将收到的信息最后一行，输入给本应用，本应用在后台发给openclaw，完成配对。